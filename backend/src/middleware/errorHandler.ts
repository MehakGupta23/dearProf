import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error on', req.method, req.path);
  console.error(err);
  if (err?.cause) {
    console.error('Underlying cause:', err.cause);
  }
  res.status(500).json({ error: 'Internal server error' });
}