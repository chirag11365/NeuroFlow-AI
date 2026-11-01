import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { repository } from '../services/repository.js';
import { env } from '../config/env.js';
import { httpError } from '../utils/httpError.js';

const publicUser = ({ _id, name, email }) => ({ id: String(_id), name, email });
const issueToken = (user) => jwt.sign({ id: String(user._id), email: user.email, name: user.name }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export async function register(req, res) {
  const name = String(req.body.name || '').trim(); const email = String(req.body.email || '').trim().toLowerCase(); const password = String(req.body.password || '');
  if (!name || !email || password.length < 6) throw httpError(400, 'Name, email, and a password of at least 6 characters are required');
  if (await repository.getOne('users', { email })) throw httpError(409, 'An account with this email already exists');
  const user = await repository.create('users', { name, email, password: await bcrypt.hash(password, 10), created_at: new Date() });
  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
}

export async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase(); const password = String(req.body.password || '');
  const user = await repository.getOne('users', { email });
  if (!user || !(await bcrypt.compare(password, user.password))) throw httpError(401, 'Invalid email or password');
  res.json({ token: issueToken(user), user: publicUser(user) });
}

export async function me(req, res) {
  const user = await repository.getById('users', req.user.id);
  if (!user) throw httpError(401, 'Account no longer exists');
  res.json({ user: publicUser(user) });
}
