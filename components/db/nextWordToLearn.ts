import { Card} from "../db/database";

export default function wordGenerator (cards: Card[]) {

  const now = new Date();
  let cardsToReview = cards.filter(card => {
    const lastReviewDate = new Date(card.lastRepeat);
    const daysToNextReview = card.level; // Fibonacci number representing days
    const nextReviewDate = new Date(lastReviewDate.getTime());
    nextReviewDate.setDate(lastReviewDate.getDate() + daysToNextReview);
    
    return nextReviewDate <= now;
  });
  
  return cardsToReview;
    
}

export function getNextFibonacciLike(current:number) {
    if (current < 2) return 2;
  
    let a = 2, b = 3;
    while (b <= current) {
      [a, b] = [b, a + b];
    }
    return b;
  }