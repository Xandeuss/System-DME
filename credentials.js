// Static credentials used by the app.
// The login will check this first, then fall back to localStorage.
// WARNING: Storing credentials in client-side files is insecure. Use only for local testing.

window._DME_CREDENTIALS = [
    {
        username: "Xandelicado",
        password: "123456",
        status: "ativo"
    }
];

// Merge static credentials into localStorage.dme_users without overwriting existing users.
(function mergeStaticCredentials() {
    try {
        const existing = JSON.parse(localStorage.getItem('dme_users')) || [];
        const existingUsernames = new Set(existing.map(u => (u.username || '').toString().toLowerCase()));

        let changed = false;
        window._DME_CREDENTIALS.forEach(cred => {
            const uname = (cred.username || '').toString();
            if (!existingUsernames.has(uname.toLowerCase())) {
                existing.push({
                    username: uname,
                    email: cred.email || (uname.toLowerCase() + '@local.test'),
                    password: (cred.password || '').toString(),
                    status: cred.status || 'ativo',
                    registradoEm: new Date().toLocaleString('pt-BR')
                });
                existingUsernames.add(uname.toLowerCase());
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem('dme_users', JSON.stringify(existing));
            console.log('credentials.js: static credentials merged into localStorage.dme_users');
        }
    } catch (err) {
        console.warn('credentials.js: failed to merge static credentials', err);
    }
})();
