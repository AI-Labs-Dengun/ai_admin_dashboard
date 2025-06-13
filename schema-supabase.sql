-- Antes de atualizar as tabelas dos bots 

-- STEP 0: LIMPAR TABELA DE AUTENTICAÇÃO
DO $$ 
BEGIN
    -- Desabilitar triggers temporariamente
    ALTER TABLE auth.users DISABLE TRIGGER ALL;
    
    -- Limpar tabela de autenticação
    DELETE FROM auth.users;
    
    -- Reabilitar triggers
    ALTER TABLE auth.users ENABLE TRIGGER ALL;
    
    -- Resetar sequências
    ALTER SEQUENCE auth.users_id_seq RESTART WITH 1;
    
    RAISE NOTICE 'Tabela de autenticação limpa com sucesso';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao limpar tabela de autenticação: %', SQLERRM;
END $$;

-- STEP 1: DROP DE VIEWS E DEPENDÊNCIAS

DROP VIEW IF EXISTS public.view_admin_bot_access CASCADE;
DROP VIEW IF EXISTS public.token_usage_summary CASCADE;
DROP VIEW IF EXISTS public.user_roles_summary CASCADE;
DROP VIEW IF EXISTS public.jwt_token_data CASCADE;
DROP VIEW IF EXISTS public.user_bots_details CASCADE;
DROP VIEW IF EXISTS public.bot_notifications_summary CASCADE;
DROP VIEW IF EXISTS public.token_usage_analytics CASCADE;
DROP VIEW IF EXISTS public.chat_summaries CASCADE;
DROP VIEW IF EXISTS public.bot_messages_summary CASCADE;
DROP VIEW IF EXISTS public.bot_status_summary CASCADE;
DROP VIEW IF EXISTS public.bot_errors_summary CASCADE;

-- STEP 2: DROP DE TRIGGERS (ANTES DAS FUNÇÕES)

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_allow_bot_access_change ON public.tenant_users;
DROP TRIGGER IF EXISTS on_tenant_user_deletion ON public.tenant_users;
DROP TRIGGER IF EXISTS on_tenant_bot_deactivation ON public.tenant_bots;
DROP TRIGGER IF EXISTS on_user_bot_access_deactivation ON public.user_bots;
DROP TRIGGER IF EXISTS set_updated_at ON public.bot_notifications;
DROP TRIGGER IF EXISTS on_token_usage_update ON public.token_usage;

-- STEP 3: DROP DE POLÍTICAS

DROP POLICY IF EXISTS "Users can select their profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can do everything on tenant_users" ON public.tenant_users;
DROP POLICY IF EXISTS "Super admins can do everything on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Super admins can do everything on bots" ON public.bots;
DROP POLICY IF EXISTS "Super admins can do everything on tenant_bots" ON public.tenant_bots;
DROP POLICY IF EXISTS "Super admins can do everything on token_usage" ON public.token_usage;
DROP POLICY IF EXISTS "Admins can view their tenant's data" ON public.tenant_users;
DROP POLICY IF EXISTS "Admins can view their tenant's bots" ON public.tenant_bots;
DROP POLICY IF EXISTS "Admins can view their tenant's token usage" ON public.token_usage;
DROP POLICY IF EXISTS "Super admins can do everything on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can do everything on user_bots" ON public.user_bots;
DROP POLICY IF EXISTS "Super admins can do everything on bot notifications" ON public.bot_notifications;
DROP POLICY IF EXISTS "Admins can view their own tenant data" ON public.tenant_users;
DROP POLICY IF EXISTS "Admins can view their tenant's bots" ON public.tenant_bots;
DROP POLICY IF EXISTS "Admins can view their tenant's token usage" ON public.token_usage;
DROP POLICY IF EXISTS "Admins can view their own user bots" ON public.user_bots;
DROP POLICY IF EXISTS "Admins can manage their own user bots" ON public.user_bots;
DROP POLICY IF EXISTS "Admins can record token usage" ON public.token_usage;
DROP POLICY IF EXISTS "Admins can update token usage" ON public.token_usage;

-- STEP 4: DROP DE FUNÇÕES

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.handle_allow_bot_access_change() CASCADE;
DROP FUNCTION IF EXISTS public.handle_tenant_user_deletion() CASCADE;
DROP FUNCTION IF EXISTS public.reset_user_tokens(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.handle_tenant_bot_deactivation() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_bot_access_deactivation() CASCADE;
DROP FUNCTION IF EXISTS public.handle_token_usage_update() CASCADE;

-- STEP 5: DROP DAS TABELAS (ORDEM CORRETA)

DROP TABLE IF EXISTS public.token_usage CASCADE;
DROP TABLE IF EXISTS public.user_bots CASCADE;
DROP TABLE IF EXISTS public.tenant_bots CASCADE;
DROP TABLE IF EXISTS public.tenant_users CASCADE;
DROP TABLE IF EXISTS public.bots CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.bot_notifications CASCADE;
DROP TABLE IF EXISTS public.bot_requests CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.bot_messages CASCADE;
DROP TABLE IF EXISTS public.bot_webhooks CASCADE;
DROP TABLE IF EXISTS public.bot_status CASCADE;
DROP TABLE IF EXISTS public.bot_errors CASCADE;

-- STEP 6: CRIAÇÃO DAS TABELAS

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    company TEXT,
    is_super_admin BOOLEAN DEFAULT FALSE,
    password_changed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    token_limit INTEGER DEFAULT 1000000,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE TABLE public.tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    allow_bot_access BOOLEAN DEFAULT TRUE,
    token_limit INTEGER DEFAULT 1000000,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    CONSTRAINT unique_user_per_tenant UNIQUE (tenant_id, user_id),
    CONSTRAINT fk_user_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    bot_capabilities TEXT[] DEFAULT '{}',
    contact_email TEXT,
    website TEXT,
    max_tokens_per_request INTEGER DEFAULT 1000,
    bot_secret TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    CONSTRAINT unique_bot_secret UNIQUE (bot_secret)
);

-- Adicionar comentário para documentar a coluna bot_secret
COMMENT ON COLUMN public.bots.bot_secret IS 'Secret único do bot para autenticação com aplicações externas';

-- Adicionar índice para melhorar performance de busca por bot_secret
CREATE INDEX idx_bots_secret ON public.bots(bot_secret);

-- Função para gerar bot_secret único
CREATE OR REPLACE FUNCTION public.generate_bot_secret()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para gerar bot_secret automaticamente
CREATE OR REPLACE FUNCTION public.handle_bot_secret_generation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.bot_secret IS NULL THEN
        NEW.bot_secret := public.generate_bot_secret();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_bot_secret_generation
BEFORE INSERT ON public.bots
FOR EACH ROW
EXECUTE FUNCTION public.handle_bot_secret_generation();

CREATE TABLE public.tenant_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    CONSTRAINT unique_bot_per_tenant UNIQUE (tenant_id, bot_id)
);

CREATE TABLE public.token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    tokens_used INTEGER DEFAULT 0,
    interactions INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    action_type TEXT NOT NULL CHECK (action_type IN ('chat', 'summary', 'image_generation', 'other')),
    chat_id UUID,
    chat_summary TEXT,
    chat_content TEXT,
    request_timestamp TIMESTAMPTZ DEFAULT timezone('utc', now()),
    response_timestamp TIMESTAMPTZ DEFAULT timezone('utc', now()),
    last_used TIMESTAMPTZ DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    CONSTRAINT positive_tokens CHECK (tokens_used >= 0 AND total_tokens >= 0),
    CONSTRAINT positive_interactions CHECK (interactions >= 0),
    CONSTRAINT valid_timestamps CHECK (
        request_timestamp <= response_timestamp AND
        request_timestamp <= last_used AND
        response_timestamp <= last_used
    )
);

-- Adicionar índices para melhor performance nas consultas
CREATE INDEX idx_token_usage_user_id ON public.token_usage(user_id);
CREATE INDEX idx_token_usage_tenant_id ON public.token_usage(tenant_id);
CREATE INDEX idx_token_usage_bot_id ON public.token_usage(bot_id);
CREATE INDEX idx_token_usage_action_type ON public.token_usage(action_type);
CREATE INDEX idx_token_usage_request_timestamp ON public.token_usage(request_timestamp);
CREATE INDEX idx_token_usage_last_used ON public.token_usage(last_used);
CREATE INDEX idx_token_usage_composite ON public.token_usage(user_id, tenant_id, bot_id);

-- Criar uma view para análise de uso de tokens por período
CREATE OR REPLACE VIEW public.token_usage_analytics AS
SELECT
    tu.tenant_id,
    tu.bot_id,
    tu.user_id,
    tu.action_type,
    DATE_TRUNC('day', tu.request_timestamp) as usage_date,
    COUNT(*) as total_requests,
    SUM(tu.total_tokens) as total_tokens,
    AVG(tu.total_tokens) as avg_tokens_per_request,
    MIN(tu.request_timestamp) as first_request,
    MAX(tu.request_timestamp) as last_request
FROM public.token_usage tu
GROUP BY 
    tu.tenant_id,
    tu.bot_id,
    tu.user_id,
    tu.action_type,
    DATE_TRUNC('day', tu.request_timestamp);

-- Criar uma view para resumo de chats
CREATE OR REPLACE VIEW public.chat_summaries AS
SELECT
    tu.id,
    tu.user_id,
    tu.tenant_id,
    tu.bot_id,
    b.name as bot_name,
    p.email as user_email,
    p.full_name as user_name,
    tu.chat_summary,
    tu.chat_content,
    tu.total_tokens,
    tu.action_type,
    tu.request_timestamp,
    tu.response_timestamp
FROM public.token_usage tu
JOIN public.bots b ON tu.bot_id = b.id
JOIN public.profiles p ON tu.user_id = p.id
WHERE tu.action_type IN ('chat', 'summary')
ORDER BY tu.request_timestamp DESC;

CREATE TABLE public.user_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    CONSTRAINT unique_user_bot_per_tenant UNIQUE (user_id, tenant_id, bot_id)
);

-- Tabela de solicitações de bots
CREATE TABLE public.bot_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_name TEXT NOT NULL,
    bot_description TEXT,
    bot_capabilities TEXT[] DEFAULT '{}',
    contact_email TEXT NOT NULL,
    website TEXT,
    max_tokens_per_request INTEGER DEFAULT 1000,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    attempts INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Tabela de notificações de bots
CREATE TABLE public.bot_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NULL,
    request_id UUID NULL REFERENCES public.bot_requests(id),
    bot_name TEXT NOT NULL,
    bot_description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    notification_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Tabela de mensagens do bot
CREATE TABLE public.bot_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Tabela de webhooks do bot
CREATE TABLE public.bot_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Tabela de status do bot
CREATE TABLE public.bot_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT timezone('utc', now()),
    CONSTRAINT unique_bot_tenant_status UNIQUE (bot_id, tenant_id)
);

-- Tabela de erros do bot
CREATE TABLE public.bot_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    error_message TEXT NOT NULL,
    error_code TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Adicionar índices para melhor performance
CREATE INDEX idx_bot_messages_bot_id ON public.bot_messages(bot_id);
CREATE INDEX idx_bot_messages_tenant_id ON public.bot_messages(tenant_id);
CREATE INDEX idx_bot_messages_user_id ON public.bot_messages(user_id);
CREATE INDEX idx_bot_messages_created_at ON public.bot_messages(created_at);

CREATE INDEX idx_bot_webhooks_bot_id ON public.bot_webhooks(bot_id);
CREATE INDEX idx_bot_webhooks_tenant_id ON public.bot_webhooks(tenant_id);
CREATE INDEX idx_bot_webhooks_event_type ON public.bot_webhooks(event_type);
CREATE INDEX idx_bot_webhooks_created_at ON public.bot_webhooks(created_at);

CREATE INDEX idx_bot_status_bot_id ON public.bot_status(bot_id);
CREATE INDEX idx_bot_status_tenant_id ON public.bot_status(tenant_id);
CREATE INDEX idx_bot_status_last_updated ON public.bot_status(last_updated);

CREATE INDEX idx_bot_errors_bot_id ON public.bot_errors(bot_id);
CREATE INDEX idx_bot_errors_tenant_id ON public.bot_errors(tenant_id);
CREATE INDEX idx_bot_errors_created_at ON public.bot_errors(created_at);

-- STEP 7: TRIGGERS

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_company TEXT;
    v_is_super_admin BOOLEAN;
BEGIN
    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
    v_company := COALESCE(new.raw_user_meta_data->>'company', '');
    v_is_super_admin := COALESCE((new.raw_user_meta_data->>'is_super_admin')::BOOLEAN, false);

    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        company, 
        is_super_admin,
        password_changed,
        created_at,
        updated_at
    )
    VALUES (
        new.id, 
        new.email, 
        v_full_name, 
        v_company, 
        v_is_super_admin,
        false,
        timezone('utc', now()),
        timezone('utc', now())
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- STEP 8: FUNÇÃO is_super_admin()

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_super_admin = true
    );
$$;

CREATE OR REPLACE FUNCTION public.handle_allow_bot_access_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.allow_bot_access IS DISTINCT FROM NEW.allow_bot_access THEN
        UPDATE public.user_bots
        SET enabled = NEW.allow_bot_access
        WHERE user_id = NEW.user_id
        AND tenant_id = NEW.tenant_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar associações quando um usuário é removido do tenant
CREATE OR REPLACE FUNCTION public.handle_tenant_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Remover associações com bots
    DELETE FROM public.user_bots
    WHERE user_id = OLD.user_id
    AND tenant_id = OLD.tenant_id;

    -- Remover registros de uso de tokens
    DELETE FROM public.token_usage
    WHERE user_id = OLD.user_id
    AND tenant_id = OLD.tenant_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para resetar tokens de um usuário
CREATE OR REPLACE FUNCTION public.reset_user_tokens(
    p_user_id UUID,
    p_tenant_id UUID,
    p_bot_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    IF p_bot_id IS NULL THEN
        -- Resetar todos os tokens do usuário no tenant
        UPDATE token_usage
        SET total_tokens = 0,
            updated_at = now()
        WHERE user_id = p_user_id
        AND tenant_id = p_tenant_id;
    ELSE
        -- Resetar tokens de um bot específico
        UPDATE token_usage
        SET total_tokens = 0,
            updated_at = now()
        WHERE user_id = p_user_id
        AND tenant_id = p_tenant_id
        AND bot_id = p_bot_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para propagar desativação do bot no tenant
CREATE OR REPLACE FUNCTION public.handle_tenant_bot_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.enabled = true AND NEW.enabled = false THEN
        -- Desativar acesso ao bot para todos os usuários do tenant
        UPDATE public.user_bots
        SET enabled = false
        WHERE tenant_id = NEW.tenant_id
        AND bot_id = NEW.bot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar tokens quando um bot é desativado para um usuário
CREATE OR REPLACE FUNCTION public.handle_user_bot_access_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.enabled = true AND NEW.enabled = false THEN
        -- Manter o histórico de tokens, apenas desativar o acesso
        -- Não é necessário limpar os tokens aqui
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar last_used quando tokens são usados
CREATE OR REPLACE FUNCTION public.handle_token_usage_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used = now();
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para monitorar mudanças no allow_bot_access
CREATE TRIGGER on_allow_bot_access_change
AFTER UPDATE ON public.tenant_users
FOR EACH ROW
WHEN (OLD.allow_bot_access IS DISTINCT FROM NEW.allow_bot_access)
EXECUTE FUNCTION public.handle_allow_bot_access_change();

-- Trigger para limpar associações ao remover usuário do tenant
CREATE TRIGGER on_tenant_user_deletion
BEFORE DELETE ON public.tenant_users
FOR EACH ROW
EXECUTE FUNCTION public.handle_tenant_user_deletion();

-- Trigger para propagar desativação do bot no tenant
CREATE TRIGGER on_tenant_bot_deactivation
AFTER UPDATE ON public.tenant_bots
FOR EACH ROW
WHEN (OLD.enabled IS DISTINCT FROM NEW.enabled)
EXECUTE FUNCTION public.handle_tenant_bot_deactivation();

-- Trigger para monitorar desativação de acesso ao bot para um usuário
CREATE TRIGGER on_user_bot_access_deactivation
AFTER UPDATE ON public.user_bots
FOR EACH ROW
WHEN (OLD.enabled IS DISTINCT FROM NEW.enabled)
EXECUTE FUNCTION public.handle_user_bot_access_deactivation();

-- Trigger para atualizar last_used em token_usage
CREATE TRIGGER on_token_usage_update
BEFORE UPDATE ON public.token_usage
FOR EACH ROW
EXECUTE FUNCTION public.handle_token_usage_update();

-- Trigger para atualizar updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.bot_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.bot_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 9: RLS

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_errors ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can select their profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_super_admin());

-- Super Admin Policies

CREATE POLICY "Super admins can do everything on profiles"
    ON public.profiles FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Super admins can do everything on tenants"
    ON public.tenants FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Super admins can do everything on tenant_users"
    ON public.tenant_users FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Super admins can do everything on bots"
    ON public.bots FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Super admins can do everything on tenant_bots"
    ON public.tenant_bots FOR ALL
    USING (public.is_super_admin());

-- Adicionar políticas para bot_requests
CREATE POLICY "Super admins can do everything on bot_requests"
    ON public.bot_requests FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Super admins can view all bot requests"
    ON public.bot_requests FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Super admins can insert bot requests"
    ON public.bot_requests FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update bot requests"
    ON public.bot_requests FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Super admins can delete bot requests"
    ON public.bot_requests FOR DELETE
    USING (public.is_super_admin());

-- Políticas específicas para token_usage
CREATE POLICY "Super admins can view all token usage"
    ON public.token_usage FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Super admins can insert token usage"
    ON public.token_usage FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update token usage"
    ON public.token_usage FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Bots can insert their own token usage"
    ON public.token_usage FOR INSERT
    WITH CHECK (
        bot_id IN (
            SELECT id FROM public.bots 
            WHERE bot_secret = current_setting('request.headers')::json->>'x-bot-secret'
        )
    );

CREATE POLICY "Bots can update their own token usage"
    ON public.token_usage FOR UPDATE
    USING (
        bot_id IN (
            SELECT id FROM public.bots 
            WHERE bot_secret = current_setting('request.headers')::json->>'x-bot-secret'
        )
    );

CREATE POLICY "Admins can view their tenant's token usage"
    ON public.token_usage FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_users tu
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = token_usage.tenant_id
            AND tu.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert token usage for their tenant"
    ON public.token_usage FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tenant_users tu
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = token_usage.tenant_id
            AND tu.role = 'admin'
            AND tu.allow_bot_access = true
        )
    );

CREATE POLICY "Admins can update token usage for their tenant"
    ON public.token_usage FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_users tu
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = token_usage.tenant_id
            AND tu.role = 'admin'
            AND tu.allow_bot_access = true
        )
    );

-- Função para validar e atualizar token_usage
CREATE OR REPLACE FUNCTION public.handle_token_usage_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar last_used e updated_at
    NEW.last_used = now();
    NEW.updated_at = now();

    -- Garantir que interactions seja não negativo
    IF NEW.interactions < 0 THEN
        NEW.interactions = 0;
    END IF;

    -- Garantir que tokens_used seja não negativo
    IF NEW.tokens_used < 0 THEN
        NEW.tokens_used = 0;
    END IF;

    -- Garantir que total_tokens seja não negativo
    IF NEW.total_tokens < 0 THEN
        NEW.total_tokens = 0;
    END IF;

    -- Validar timestamps
    IF NEW.request_timestamp > NEW.response_timestamp THEN
        NEW.response_timestamp = NEW.request_timestamp;
    END IF;

    IF NEW.response_timestamp > NEW.last_used THEN
        NEW.last_used = NEW.response_timestamp;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger para atualização de token_usage
DROP TRIGGER IF EXISTS on_token_usage_update ON public.token_usage;
CREATE TRIGGER on_token_usage_update
    BEFORE UPDATE ON public.token_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_token_usage_update();

-- STEP 10: VIEWS

CREATE OR REPLACE VIEW public.token_usage_summary AS
SELECT
    tu.tenant_id,
    tu.bot_id,
    SUM(tu.total_tokens) AS total_tokens
FROM public.token_usage tu
GROUP BY tu.tenant_id, tu.bot_id;

CREATE OR REPLACE VIEW public.user_roles_summary AS
SELECT
    p.id AS user_id,
    p.email,
    p.full_name,
    p.company,
    p.is_super_admin,
    CASE
        WHEN p.is_super_admin THEN 'super-admin'
        WHEN EXISTS (
            SELECT 1 FROM public.tenant_users tu
            WHERE tu.user_id = p.id
        ) THEN 'admin'
        ELSE 'user'
    END AS role_summary,
    ARRAY(
        SELECT t.name
        FROM public.tenant_users tu
        JOIN public.tenants t ON tu.tenant_id = t.id
        WHERE tu.user_id = p.id
    ) AS associated_tenants
FROM public.profiles p;

-- Nova view para geração de token JWT
CREATE OR REPLACE VIEW public.jwt_token_data AS
SELECT 
    tu.user_id,
    tu.tenant_id,
    tu.allow_bot_access,
    tu.token_limit,
    p.full_name as admin_name,
    p.email as admin_email,
    ARRAY_AGG(
        CASE 
            WHEN ub.enabled = true THEN ub.bot_id 
            ELSE NULL 
        END
    ) FILTER (WHERE ub.enabled = true) AS enabled_bots,
    ARRAY_AGG(
        CASE 
            WHEN ub.enabled = true THEN b.name 
            ELSE NULL 
        END
    ) FILTER (WHERE ub.enabled = true) AS enabled_bot_names
FROM public.tenant_users tu
LEFT JOIN public.user_bots ub ON 
    tu.user_id = ub.user_id AND 
    tu.tenant_id = ub.tenant_id
LEFT JOIN public.profiles p ON
    tu.user_id = p.id
LEFT JOIN public.bots b ON
    ub.bot_id = b.id
GROUP BY 
    tu.user_id,
    tu.tenant_id,
    tu.allow_bot_access,
    tu.token_limit,
    p.full_name,
    p.email;

-- Nova view para visualização detalhada de user_bots
CREATE OR REPLACE VIEW public.user_bots_details AS
SELECT 
    ub.id,
    ub.user_id,
    ub.tenant_id,
    ub.bot_id,
    ub.enabled,
    ub.created_at,
    p.full_name as admin_name,
    p.email as admin_email,
    b.name as bot_name,
    b.description as bot_description,
    b.website as bot_website,
    b.bot_capabilities,
    b.contact_email as bot_contact_email,
    b.max_tokens_per_request,
    tu.allow_bot_access,
    tu.token_limit,
    t.name as tenant_name,
    COALESCE(token_stats.total_tokens_used, 0) as tokens_consumed,
    COALESCE(token_stats.last_token_usage, ub.created_at) as last_token_usage,
    jtd.enabled_bots,
    jtd.token_limit as jwt_token_limit,
    jtd.allow_bot_access as jwt_allow_bot_access
FROM public.user_bots ub
LEFT JOIN public.profiles p ON
    ub.user_id = p.id
LEFT JOIN public.bots b ON
    ub.bot_id = b.id
LEFT JOIN public.tenant_users tu ON
    ub.user_id = tu.user_id AND
    ub.tenant_id = tu.tenant_id
LEFT JOIN public.tenants t ON
    ub.tenant_id = t.id
LEFT JOIN public.jwt_token_data jtd ON
    ub.user_id = jtd.user_id AND
    ub.tenant_id = jtd.tenant_id
LEFT JOIN (
    SELECT 
        user_id,
        bot_id,
        tenant_id,
        SUM(total_tokens) as total_tokens_used,
        MAX(last_used) as last_token_usage
    FROM public.token_usage
    GROUP BY user_id, bot_id, tenant_id
) token_stats ON
    ub.user_id = token_stats.user_id AND
    ub.bot_id = token_stats.bot_id AND
    ub.tenant_id = token_stats.tenant_id;

-- View para resumo de notificações
CREATE OR REPLACE VIEW public.bot_notifications_summary AS
SELECT
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) as total_count,
    (
        SELECT COUNT(*)
        FROM public.bot_requests
        WHERE status = 'pending'
    ) as pending_requests_count
FROM public.bot_notifications;

-- View para resumo de mensagens do bot
CREATE OR REPLACE VIEW public.bot_messages_summary AS
SELECT
    bm.bot_id,
    bm.tenant_id,
    b.name as bot_name,
    t.name as tenant_name,
    COUNT(*) as total_messages,
    COUNT(*) FILTER (WHERE bm.direction = 'incoming') as incoming_messages,
    COUNT(*) FILTER (WHERE bm.direction = 'outgoing') as outgoing_messages,
    MAX(bm.created_at) as last_message_at
FROM public.bot_messages bm
JOIN public.bots b ON bm.bot_id = b.id
JOIN public.tenants t ON bm.tenant_id = t.id
GROUP BY bm.bot_id, bm.tenant_id, b.name, t.name;

-- View para resumo de status dos bots
CREATE OR REPLACE VIEW public.bot_status_summary AS
SELECT
    bs.bot_id,
    bs.tenant_id,
    b.name as bot_name,
    t.name as tenant_name,
    bs.status,
    bs.last_updated,
    COUNT(bm.id) as total_messages,
    COUNT(bm.id) FILTER (WHERE bm.created_at > bs.last_updated - interval '24 hours') as messages_last_24h
FROM public.bot_status bs
JOIN public.bots b ON bs.bot_id = b.id
JOIN public.tenants t ON bs.tenant_id = t.id
LEFT JOIN public.bot_messages bm ON bs.bot_id = bm.bot_id AND bs.tenant_id = bm.tenant_id
GROUP BY bs.bot_id, bs.tenant_id, b.name, t.name, bs.status, bs.last_updated;

-- View para resumo de erros dos bots
CREATE OR REPLACE VIEW public.bot_errors_summary AS
SELECT
    be.bot_id,
    be.tenant_id,
    b.name as bot_name,
    t.name as tenant_name,
    COUNT(*) as total_errors,
    COUNT(*) FILTER (WHERE be.created_at > now() - interval '24 hours') as errors_last_24h,
    MAX(be.created_at) as last_error_at
FROM public.bot_errors be
JOIN public.bots b ON be.bot_id = b.id
JOIN public.tenants t ON be.tenant_id = t.id
GROUP BY be.bot_id, be.tenant_id, b.name, t.name;

-- Função para limpar todas as dependências de um usuário
CREATE OR REPLACE FUNCTION public.cleanup_user_dependencies(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Log inicial
    RAISE NOTICE 'Iniciando limpeza de dependências para usuário: %', p_user_id;

    -- Remover webhooks relacionados ao usuário
    DELETE FROM public.bot_webhooks
    WHERE bot_id IN (
        SELECT bot_id FROM public.user_bots WHERE user_id = p_user_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Webhooks removidos: %', v_count;

    -- Remover status relacionados ao usuário
    DELETE FROM public.bot_status
    WHERE bot_id IN (
        SELECT bot_id FROM public.user_bots WHERE user_id = p_user_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Status removidos: %', v_count;

    -- Remover erros relacionados ao usuário
    DELETE FROM public.bot_errors
    WHERE bot_id IN (
        SELECT bot_id FROM public.user_bots WHERE user_id = p_user_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Erros removidos: %', v_count;

    -- Remover mensagens do bot
    DELETE FROM public.bot_messages
    WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Mensagens removidas: %', v_count;

    -- Remover uso de tokens
    DELETE FROM public.token_usage
    WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Tokens removidos: %', v_count;

    -- Remover associações com bots
    DELETE FROM public.user_bots
    WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Associações com bots removidas: %', v_count;

    -- Remover associações com tenants
    DELETE FROM public.tenant_users
    WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Associações com tenants removidas: %', v_count;

    -- Remover perfil
    DELETE FROM public.profiles
    WHERE id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Perfil removido: %', v_count;

    RAISE NOTICE 'Limpeza de dependências concluída para usuário: %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para limpar dependências antes de deletar usuário
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Iniciando processo de deleção para usuário: %', OLD.id;
    
    -- Verificar se o usuário existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.id) THEN
        RAISE EXCEPTION 'Usuário não encontrado: %', OLD.id;
    END IF;

    -- Limpar dependências
    PERFORM public.cleanup_user_dependencies(OLD.id);
    
    RAISE NOTICE 'Processo de deleção concluído para usuário: %', OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger para limpar dependências
DROP TRIGGER IF EXISTS on_auth_user_deletion ON auth.users;
CREATE TRIGGER on_auth_user_deletion
BEFORE DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_deletion();

-- Adicionar função para deletar usuário com tratamento de erro
CREATE OR REPLACE FUNCTION public.delete_user_safe(p_user_id UUID)
RETURNS boolean AS $$
DECLARE
    v_success boolean;
BEGIN
    BEGIN
        -- Iniciar transação
        RAISE NOTICE 'Iniciando deleção segura do usuário: %', p_user_id;
        
        -- Limpar dependências primeiro
        PERFORM public.cleanup_user_dependencies(p_user_id);
        
        -- Deletar usuário
        DELETE FROM auth.users WHERE id = p_user_id;
        
        v_success := true;
        RAISE NOTICE 'Usuário deletado com sucesso: %', p_user_id;
    EXCEPTION WHEN OTHERS THEN
        v_success := false;
        RAISE NOTICE 'Erro ao deletar usuário %: %', p_user_id, SQLERRM;
    END;
    
    RETURN v_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 11: PERMISSÕES

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Nova política para permitir que admins registrem uso de tokens
CREATE POLICY "Admins can record token usage"
    ON public.token_usage FOR INSERT
    WITH CHECK (
        public.is_super_admin() OR
        EXISTS (
            SELECT 1 FROM public.tenant_users tu
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = token_usage.tenant_id
            AND tu.role = 'admin'
            AND tu.allow_bot_access = true
        )
    );

CREATE POLICY "Admins can update token usage"
    ON public.token_usage FOR UPDATE
    USING (
        public.is_super_admin() OR
        EXISTS (
            SELECT 1 FROM public.tenant_users tu
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = token_usage.tenant_id
            AND tu.role = 'admin'
            AND tu.allow_bot_access = true
        )
    );

-- Nova política para permitir que usuários registrem seu próprio uso de tokens
CREATE POLICY "Users can record their own token usage"
    ON public.token_usage FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        public.is_super_admin() OR
        EXISTS (
            SELECT 1 FROM public.tenant_users tu
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = token_usage.tenant_id
            AND tu.role = 'admin'
            AND tu.allow_bot_access = true
        )
    );

-- Nova política para permitir que usuários atualizem seu próprio uso de tokens
CREATE POLICY "Users can update their own token usage"
    ON public.token_usage FOR UPDATE
    USING (
        user_id = auth.uid() OR
        public.is_super_admin() OR
        EXISTS (
            SELECT 1 FROM public.tenant_users tu
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = token_usage.tenant_id
            AND tu.role = 'admin'
            AND tu.allow_bot_access = true
        )
    );

-- Bot Secret Policies
CREATE POLICY "Super admins can view bot secrets"
    ON public.bots FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Super admins can update bot secrets"
    ON public.bots FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Super admins can insert bot secrets"
    ON public.bots FOR INSERT
    WITH CHECK (public.is_super_admin());

-- Política para permitir que bots validem seu próprio secret
CREATE POLICY "Bots can validate their own secret"
    ON public.bots FOR SELECT
    USING (
        bot_secret = current_setting('request.headers')::json->>'x-bot-secret'
    );

-- Função para validar bot_secret
CREATE OR REPLACE FUNCTION public.validate_bot_secret(p_bot_secret TEXT)
RETURNS TABLE (
    bot_id UUID,
    bot_name TEXT,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        TRUE as is_valid
    FROM public.bots b
    WHERE b.bot_secret = p_bot_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para renovar bot_secret
CREATE OR REPLACE FUNCTION public.renew_bot_secret(p_bot_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_new_secret TEXT;
BEGIN
    -- Gerar novo secret
    v_new_secret := public.generate_bot_secret();
    
    -- Atualizar o bot com o novo secret
    UPDATE public.bots
    SET bot_secret = v_new_secret
    WHERE id = p_bot_id;
    
    RETURN v_new_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para permitir que super admins vejam os dados relacionados
CREATE POLICY "Super admins can view related data"
    ON public.profiles FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Super admins can view tenant data"
    ON public.tenants FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Super admins can view bot data"
    ON public.bots FOR SELECT
    USING (public.is_super_admin());

-- Políticas para tenant_users
CREATE POLICY "Super admins can insert tenant users"
    ON public.tenant_users FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update tenant users"
    ON public.tenant_users FOR UPDATE
    USING (public.is_super_admin());

-- Políticas para user_bots
CREATE POLICY "Super admins can insert user bots"
    ON public.user_bots FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update user bots"
    ON public.user_bots FOR UPDATE
    USING (public.is_super_admin());

-- Políticas para tenant_bots
CREATE POLICY "Super admins can insert tenant bots"
    ON public.tenant_bots FOR INSERT
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update tenant bots"
    ON public.tenant_bots FOR UPDATE
    USING (public.is_super_admin());
