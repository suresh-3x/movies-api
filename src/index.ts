import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient, Ticket } from '@prisma/client';
import { CreateTicketRequest, UpdateTicketRequest } from './types';
import { handleErrorResponse, validateCreateTicketRequest, validateUpdateTicketRequest } from './utils';


const app = express();
const PORT: number = 3000;

app.use(express.json());

const prisma: PrismaClient = new PrismaClient();

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization;  
  if (token === 'Bearer admin') {
    next();
  } else {
    handleErrorResponse(res, 401, 'Unauthorized');
  }
}

app.post('/tickets', authenticate, validateCreateTicketRequest, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerName, movieId, ticketPrice }: CreateTicketRequest = req.body;
    const ticket: Ticket = await prisma.ticket.create({
      data: {
        customerName,
        movieId,
        ticketPrice,
      },
    });
    console.log('Created ticket:', ticket);
    res.json(ticket);
  } catch (err: any) {
    console.error('Error creating ticket:', err);
    next(err);
  }
});

app.get('/tickets', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tickets: Ticket[] = await prisma.ticket.findMany({
      include: { movie: true },
    });
    console.log('Fetched tickets:', tickets);
    res.json(tickets);
  } catch (err: any) {
    console.error('Error fetching tickets:', err);
    next(err);
  }
});

app.get('/tickets/:id', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const id: number = parseInt(req.params.id, 10);
  console.log('Ticket ID:', id);
  if (isNaN(id)) {
    handleErrorResponse(res, 400, 'Invalid ID');
    return;
  }
  try {
    const ticket: Ticket | null = await prisma.ticket.findUnique({
      where: { id },
      include: { movie: true },
    });
    if (!ticket) {
      console.log('Ticket not found');
      handleErrorResponse(res, 404, 'Ticket not found');
      return;
    }
    console.log('Fetched ticket:', ticket);
    res.json(ticket);
  } catch (err: any) {
    console.error('Error fetching ticket:', err);
    next(err);
  }
});

app.put('/tickets/:id', authenticate, validateUpdateTicketRequest, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { customerName, movieId, ticketPrice }: UpdateTicketRequest = req.body;
    const ticket: Ticket | null = await prisma.ticket.update({
      where: { id: parseInt(id, 10) },
      data: {
        customerName,
        movieId,
        ticketPrice,
      },
      include: { movie: true },
    });
    if (!ticket) {
      console.log('Ticket not found');
      handleErrorResponse(res, 404, 'Ticket not found');
      return;
    }
    console.log('Updated ticket:', ticket);
    res.json(ticket);
  } catch (err: any) {
    console.error('Error updating ticket:', err);
    next(err);
  }
});

app.delete('/tickets/:id', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.ticket.delete({ where: { id: parseInt(id, 10) } });
    console.log('Deleted ticket with ID:', id);
    res.sendStatus(204);
  } catch (err: any) {
    console.error('Error deleting ticket:', err);
    next(err);
  }
});

app.get('/analytics/visits/:movieId', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, method } = req.query;
    const { movieId } = req.params;

    const parsedMovieId = parseInt(movieId, 10);

    if (method === 'db-aggregation') {
      const visits: Array<{}> = await prisma.$queryRaw`
        SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'FMMonth YYYY') as month, COUNT(*) as visits
        FROM "Ticket"
        WHERE "movieId" = ${parsedMovieId}
        AND "createdAt" BETWEEN ${new Date(startDate as string)} AND ${new Date(endDate as string)}
        GROUP BY month;
      `;

      const formattedVisits = visits.map((visit: any) => ({
        ...visit,
        month: visit.month.trim(),
        visits: Number(visit.visits),
      }));

      console.log('Monthly visits (DB raw query aggregation):', formattedVisits);
      res.json(formattedVisits);
    } else {
      const tickets: Ticket[] = await prisma.ticket.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
          movieId: parsedMovieId,
        },
      });

      const monthlySummary: { month: string; visits: number }[] = [];

      tickets.forEach((ticket: Ticket) => {
        const month = ticket.createdAt.toLocaleString('default', { month: 'long', year: 'numeric' });
        const existingMonthSummary = monthlySummary.find((entry) => entry.month === month);

        if (existingMonthSummary) {
          existingMonthSummary.visits++;
        } else {
          monthlySummary.push({ month, visits: 1 });
        }
      });

      console.log('Monthly visits (JavaScript algorithms):', monthlySummary);
      res.json(monthlySummary);
    }
  } catch (err: any) {
    console.error('Error calculating visits:', err);
    next(err);
  }
});



app.get('/analytics/earnings/:movieId', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, method } = req.query;
    const { movieId } = req.params;

    const parsedMovieId = parseInt(movieId, 10);

    if (method === 'db-aggregation') {
      const earnings: Array<{}> = await prisma.$queryRaw`
        SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'FMMonth YYYY') as month, SUM("ticketPrice") as earnings
        FROM "Ticket"
        WHERE "movieId" = ${parsedMovieId}
        AND "createdAt" BETWEEN ${new Date(startDate as string)} AND ${new Date(endDate as string)}
        GROUP BY month;
      `;

      const formattedEarnings = earnings.map((earning: any) => ({
        ...earning,
        month: earning.month.trim(),
        earnings: Number(earning.earnings),
      }));

      console.log('Monthly earnings (DB raw query aggregation):', formattedEarnings);
      res.json(formattedEarnings);
    } else {
      const tickets: Ticket[] = await prisma.ticket.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
          movieId: parsedMovieId,
        },
      });

      const monthlySummary: { month: string; earnings: number }[] = [];

      tickets.forEach((ticket: Ticket) => {
        const month = ticket.createdAt.toLocaleString('default', { month: 'long', year: 'numeric' });
        const existingMonthSummary = monthlySummary.find((entry) => entry.month === month);

        if (existingMonthSummary) {
          existingMonthSummary.earnings += ticket.ticketPrice;
        } else {
          monthlySummary.push({ month, earnings: ticket.ticketPrice });
        }
      });

      console.log('Monthly earnings (JavaScript algorithms):', monthlySummary);
      res.json(monthlySummary);
    }
  } catch (err: any) {
    console.error('Error calculating earnings:', err);
    next(err);
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

