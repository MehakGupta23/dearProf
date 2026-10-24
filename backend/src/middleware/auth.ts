import { db } from '../db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm'; 
import type { Request,Response,NextFunction } from 'express';
import { supabase } from '../config/supabase';

export async function auth(req:Request, res:Response, next:NextFunction){
    const token = req.headers.authorization?.split(' ') [1];
    if(!token){
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { data: {user}, error } = await supabase.auth.getUser(token);
    
    if(error || !user){
        return res.status(401).json({ error: 'Invalid token' });
    }
    const [dbUser] = await db.select().from(users).where(eq(users.id,user.id));

    if(!dbUser || !dbUser.isActive){
        return res.status(401).json({ error: 'User not found or inactive' });
    }
    req.user=dbUser;
    next();
}