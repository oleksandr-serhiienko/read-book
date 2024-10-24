import { Card } from "@/components/db/database";

type CardUpdateListener = (card: Card) => void;

export class CardEvents {
  private static listeners: CardUpdateListener[] = [];

  // Method to subscribe to card updates
  static subscribe(listener: CardUpdateListener) {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Method to notify all listeners about a card update
  static emit(card: Card) {
    this.listeners.forEach(listener => listener(card));
  }
}