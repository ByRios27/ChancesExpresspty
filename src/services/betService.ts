import type { AppSettings, Ticket } from '../store/useStore';

export interface BetControl {
  key: string;
  normalizedKey: string;
  totalAmount: number;
  updatedAt: number;
  drawId: string;
  type: 'PALE' | 'BILLETE';
}

interface ReservationValidation {
  success: boolean;
  message?: string;
  availableAmount?: number;
}

export const reserveTicketLimits = async (
  _ticket: Partial<Ticket>,
  _settings: AppSettings,
): Promise<ReservationValidation> => ({ success: true });

export const releaseTicketLimits = async (
  _ticket: Partial<Ticket>,
  _settings: AppSettings,
): Promise<void> => undefined;

export const reconcileTicketLimits = async (
  _previousTicket: Partial<Ticket>,
  _nextTicket: Partial<Ticket>,
  _settings: AppSettings,
): Promise<ReservationValidation> => ({ success: true });

// Backward-compatible wrappers retained during migration.
export const checkAndReservePaleLimit = async (
  _drawId: string,
  _number: string,
  _amount: number,
  _globalLimit: number,
): Promise<ReservationValidation> => ({ success: true });

export const releasePaleLimit = async (
  _drawId: string,
  _number: string,
  _amount: number,
): Promise<void> => undefined;

export const checkAndReserveBilleteLimit = async (
  _drawId: string,
  _number: string,
  _amount: number,
  _globalLimit: number,
): Promise<ReservationValidation> => ({ success: true });

export const releaseBilleteLimit = async (
  _drawId: string,
  _number: string,
  _amount: number,
): Promise<void> => undefined;
