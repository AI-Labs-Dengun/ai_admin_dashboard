import nodemailer from 'nodemailer';

// Verificar se todas as variáveis de ambiente necessárias estão presentes
const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'ADMIN_EMAIL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Variáveis de ambiente SMTP faltando:', missingEnvVars);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === '465', // SSL para porta 465, TLS para outras
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verificar a conexão SMTP
transporter.verify(function (error, success) {
  if (error) {
    console.error('Erro na configuração SMTP:', error);
  } else {
    console.log('Servidor SMTP pronto para enviar emails');
  }
});

interface WelcomeEmailData {
  email: string;
  fullName: string;
  password: string;
  company: string;
}

export async function sendWelcomeEmail({ email, fullName, password, company }: WelcomeEmailData) {
  console.log('Iniciando envio de email para:', email);
  
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    cc: process.env.ADMIN_EMAIL, // Envia uma cópia para o email do admin
    subject: 'Bem-vindo à Plataforma',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Bem-vindo à Plataforma!</h2>
        
        <p>Olá ${fullName},</p>
        
        <p>É com grande satisfação que damos as boas-vindas a você e à ${company} à nossa plataforma.</p>
        
        <p>Seus dados de acesso são:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Senha:</strong> ${password}</li>
        </ul>
        
        <p>Por questões de segurança, recomendamos que você altere sua senha no primeiro acesso.</p>
        
        <p>Para acessar a plataforma, clique no link abaixo:</p>
        <p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/auth/signin" 
             style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Acessar Plataforma
          </a>
        </p>
        
        <p>Se precisar de ajuda, não hesite em entrar em contato com nossa equipe de suporte.</p>
        
        <p>Atenciosamente,<br>Equipe de Suporte</p>
      </div>
    `,
  };

  try {
    console.log('Tentando enviar email com as seguintes configurações:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      from: mailOptions.from,
      to: mailOptions.to,
      cc: mailOptions.cc
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado com sucesso:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erro detalhado ao enviar email:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      code: error instanceof Error ? (error as any).code : undefined
    });
    throw error;
  }
} 