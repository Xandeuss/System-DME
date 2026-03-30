/**
 * Configuração Central do Cliente Supabase
 * Use este cliente para todas as operações de banco de dados.
 *
 * IMPORTANTE: Este arquivo deve ser carregado APÓS o script da lib Supabase, ex.:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="/scripts/supabase-client.js"></script>
 */

const SUPABASE_URL = 'https://paowmuuomtqoxjxmmczu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhb3dtdXVvbXRxb3hqeG1tY3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjg5NjksImV4cCI6MjA4ODgwNDk2OX0.qqKSLr98S32fAVhlT8Z-O7bWve1hVAShGz3JFEGK6cM';

let supabaseClient = null;

try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase: Cliente inicializado para o projeto DME-System');
    } else {
        console.warn('Supabase: Biblioteca não encontrada. Usando mock temporário para estabilidade.');
        throw new Error('Supabase library missing');
    }
} catch (err) {
    console.error('Erro ao inicializar Supabase:', err);
    // Mock robusto para evitar ReferenceErrors no login.js e outros scripts
    supabaseClient = {
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({ data: null, error: { message: 'Supabase Offline', code: 'OFFLINE' } })
                }),
                order: () => ({
                    limit: () => ({
                        then: (cb) => cb({ data: [], error: null })
                    })
                })
            }),
            update: () => ({ eq: () => Promise.resolve({ error: null }) }),
            insert: () => Promise.resolve({ error: null }),
            delete: () => ({ eq: () => Promise.resolve({ error: null }) })
        }),
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
        }
    };
}

// Exporta como `supabase` para manter compatibilidade com o restante do código.
window.supabase = supabaseClient;
