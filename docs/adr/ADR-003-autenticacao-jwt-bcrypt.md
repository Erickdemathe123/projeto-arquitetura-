# ADR-003: JWT para autenticação e bcrypt para senhas

## Contexto

As operações administrativas pertencem ao professor autenticado e precisam
ser isoladas por usuário. As senhas não devem ser persistidas em texto puro, e
a API precisa validar a identidade e o papel do solicitante em cada requisição
protegida.

## Decisão

Armazenar senhas como hashes produzidos e verificados com `bcrypt`. Após
autenticação bem-sucedida, emitir um token JWT assinado com segredo fornecido
por variável de ambiente e validade configurada. O cliente envia o token no
cabeçalho `Authorization: Bearer`; middlewares validam o token e o papel
exigido pela rota. No front-end, o token é mantido no `localStorage` para
preservar a sessão entre carregamentos.

## Consequências

O servidor não precisa manter sessões em memória, e as rotas podem verificar
identidade e autorização por requisição. Senhas originais não são recuperáveis
a partir dos hashes. Em contrapartida, tokens expostos no navegador podem ser
usados até expirarem; por isso, o segredo deve permanecer fora do repositório,
as chamadas devem usar HTTPS e a validade do token limita a duração desse risco.
O `localStorage` é usado somente para o token, não para dados de domínio.
