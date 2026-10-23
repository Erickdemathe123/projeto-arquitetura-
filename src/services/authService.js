// Serviço: regras de negócio de autenticação, hashing e geração de JWT.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const { ErroDeNegocio } = require('../errors/appError');

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'sgp_jwt_secret_dev_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Regex para validação estrutural completa do e-mail e domínio
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function validarEmail(email) {
  const emailLimpo = texto(email).toLowerCase();
  if (!emailLimpo) {
    throw new ErroDeNegocio(400, 'Informe o e-mail.');
  }

  const match = emailLimpo.match(EMAIL_REGEX);
  if (!match) {
    throw new ErroDeNegocio(400, 'Formato de e-mail inválido.');
  }

  const dominio = match[1];
  // Rejeita domínios com partes vazias ou sem ponto
  if (!dominio || dominio.startsWith('.') || dominio.endsWith('.') || dominio.includes('..')) {
    throw new ErroDeNegocio(400, 'Domínio de e-mail inválido.');
  }

  // Se houver lista de domínios permitidos configurada via variável de ambiente (ex: "catolicasc.edu.br,instituicao.edu.br")
  if (process.env.ALLOWED_EMAIL_DOMAINS) {
    const permitidos = process.env.ALLOWED_EMAIL_DOMAINS.split(',').map((d) => d.trim().toLowerCase());
    const dominioPermitido = permitidos.some((p) => dominio === p || dominio.endsWith('.' + p));
    if (!dominioPermitido) {
      throw new ErroDeNegocio(400, `Domínio de e-mail não autorizado. Permitidos: ${permitidos.join(', ')}.`);
    }
  }

  return emailLimpo;
}

function validarSenha(senha, obrigatoria = true) {
  const senhaLimpa = typeof senha === 'string' ? senha : '';
  if (!senhaLimpa) {
    if (obrigatoria) throw new ErroDeNegocio(400, 'Informe a senha.');
    return null;
  }
  if (senhaLimpa.length < 6) {
    throw new ErroDeNegocio(400, 'A senha deve ter no mínimo 6 caracteres.');
  }
  return senhaLimpa;
}

function gerarToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function cadastrar({ nome, email, senha, role = 'professor', ra }) {
  const nomeLimpo = texto(nome);
  if (!nomeLimpo) {
    throw new ErroDeNegocio(400, 'Informe o nome completo.');
  }
  if (nomeLimpo.length > 120) {
    throw new ErroDeNegocio(400, 'O nome deve ter no máximo 120 caracteres.');
  }

  const roleLimpa = texto(role).toLowerCase();
  if (roleLimpa !== 'professor' && roleLimpa !== 'aluno') {
    throw new ErroDeNegocio(400, "Perfil inválido. Deve ser 'professor' ou 'aluno'.");
  }

  let emailValidado = null;
  let senhaValidada = null;
  const raLimpo = texto(ra) || null;

  if (roleLimpa === 'professor') {
    emailValidado = validarEmail(email);
    senhaValidada = validarSenha(senha, true);
  } else {
    // Aluno pode informar e-mail ou não, dependendo da forma de cadastro
    if (email) {
      emailValidado = validarEmail(email);
    }
    if (senha) {
      senhaValidada = validarSenha(senha, false);
    }
    if (!raLimpo && !emailValidado) {
      throw new ErroDeNegocio(400, 'Aluno deve informar ao menos RA ou e-mail.');
    }
  }

  // Verifica duplicidade de e-mail
  if (emailValidado) {
    const existentePorEmail = await userRepository.buscarPorEmail(emailValidado);
    if (existentePorEmail) {
      throw new ErroDeNegocio(409, 'E-mail já cadastrado.');
    }
  }

  // Verifica duplicidade de RA
  if (raLimpo) {
    const existentePorRa = await userRepository.buscarPorRa(raLimpo);
    if (existentePorRa) {
      throw new ErroDeNegocio(409, 'RA já cadastrado.');
    }
  }

  const passwordHash = senhaValidada ? await bcrypt.hash(senhaValidada, SALT_ROUNDS) : null;

  const novoUsuario = await userRepository.criar({
    name: nomeLimpo,
    email: emailValidado,
    passwordHash,
    role: roleLimpa,
    ra: raLimpo
  });

  const token = senhaValidada ? gerarToken(novoUsuario) : null;

  return {
    usuario: novoUsuario.toPublicJSON(),
    token
  };
}

async function login({ email, senha }) {
  const emailLimpo = validarEmail(email);
  const senhaLimpa = validarSenha(senha, true);

  const usuario = await userRepository.buscarPorEmail(emailLimpo);
  if (!usuario || !usuario.passwordHash) {
    throw new ErroDeNegocio(401, 'E-mail ou senha incorretos.');
  }

  const senhaValida = await bcrypt.compare(senhaLimpa, usuario.passwordHash);
  if (!senhaValida) {
    throw new ErroDeNegocio(401, 'E-mail ou senha incorretos.');
  }

  const token = gerarToken(usuario);

  return {
    usuario: usuario.toPublicJSON(),
    token
  };
}

async function obterUsuarioPorId(id) {
  const usuario = await userRepository.buscarPorId(id);
  if (!usuario) {
    throw new ErroDeNegocio(404, 'Usuário não encontrado.');
  }
  return usuario.toPublicJSON();
}

module.exports = {
  ErroDeNegocio,
  cadastrar,
  login,
  obterUsuarioPorId,
  gerarToken,
  validarEmail
};
