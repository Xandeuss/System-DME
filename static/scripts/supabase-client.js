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

// CORREÇÃO CRÍTICA: o código original fazia `supabase.createClient(...)` usando a
// variável `supabase` antes de ela existir — referência circular que causava erro
// "Cannot read properties of undefined".
// A biblioteca UMD expõe o namespace como `window.supabase`, então o cliente
// deve ser criado via `window.supabase.createClient` e armazenado em outro nome.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Exporta como `supabase` para manter compatibilidade com o restante do código.
// Todos os outros scripts que chamam `supabase.from(...)` continuam funcionando.
window.supabase = supabaseClient;

console.log('Supabase: Cliente inicializado para o projeto DME-System');
