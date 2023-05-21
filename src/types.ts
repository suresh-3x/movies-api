export type CreateTicketRequest = {
    customerName: string;
    movieId: number;
    ticketPrice: number;
};
  
export type UpdateTicketRequest = {
    customerName?: string;
    movieId?: number;
    ticketPrice?: number;
};