"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { use } from "react";

export default function ProxyPage({ params }: { params: Promise<{ botId: string }> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { botId } = use(params);

  useEffect(() => {
    if (!token) {
      setError("Token não fornecido");
      setLoading(false);
      return;
    }

    // Verificar se o token é válido
    fetch("/api/bots/validate-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.valid) {
          setError(data.error || "Token inválido");
          router.push("/dashboard/my-bots");
        } else {
          // Buscar o website do bot
          fetch(`/api/bots/${botId}`)
            .then((response) => response.json())
            .then((botData) => {
              if (botData.website) {
                // Se o bot tiver um website configurado, redirecionar para ele
                window.location.href = `${botData.website}?token=${token}`;
              } else {
                setError("Website do bot não configurado");
                setLoading(false);
              }
            })
            .catch((error) => {
              console.error("Erro ao buscar detalhes do bot:", error);
              setError("Erro ao buscar detalhes do bot");
              setLoading(false);
            });
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Erro ao validar token:", error);
        setError("Erro ao validar token");
        setLoading(false);
      });
  }, [token, router, botId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => router.push("/dashboard/my-bots")}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Voltar para Meus Bots
        </button>
      </div>
    );
  }

  return null; // Não renderiza nada pois será redirecionado
}