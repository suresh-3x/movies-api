import { NextFunction, Request, Response } from 'express';
import { CreateTicketRequest, UpdateTicketRequest } from './types';

export function handleErrorResponse(res: Response, statusCode: number, errorMessage: string): void {
    console.error(errorMessage);
    res.status(statusCode).json({ error: errorMessage });
}

export function validateCreateTicketRequest(req: Request, res: Response, next: NextFunction): void {
    const { customerName, movieId, ticketPrice }: CreateTicketRequest = req.body;
    if (!customerName || !movieId || !ticketPrice) {
      handleErrorResponse(res, 400, 'Invalid request data');
    } else {
      next();
    }
}
  
export function validateUpdateTicketRequest(req: Request, res: Response, next: NextFunction): void {
    const { customerName, movieId, ticketPrice }: UpdateTicketRequest = req.body;
    if (!customerName && !movieId && !ticketPrice) {
      handleErrorResponse(res, 400, 'Invalid request data');
    } else {
      next();
    }
}
  