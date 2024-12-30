import { useLanguage } from "@/app/languageSelector";
import { Card } from "./db/database";
import { ResponseTranslation } from "./reverso/reverso";
import Translation from "./reverso/languages/entities/translation";
import TranslationContext from "./reverso/languages/entities/translationContext";

export class Transform {
    static fromWordToCard(word: ResponseTranslation, sourceLanguage: string, targetLanguage: string): Card {
        const context = word.Contexts.filter(c => c.original.length < 100).slice(0, 5);
        
        const card: Card = {
            level: 0,
            sourceLanguage,
            targetLanguage,
            source: word.Book ?? 'Unknown',
            translations: word.Translations.slice(0, 5).map(t => t.word),
            userId: 'test', 
            comment: "",
            word: word.Original,
            context: context.map(c => ({
              sentence: c.original,
              translation: c.translation,
              isBad: false
            })),
            lastRepeat: new Date(),
        };
        return card;
    }

    static fromCardToWord(card: Card): ResponseTranslation {
        const word: ResponseTranslation = {
            Book: card.source,
            Original: card.word,
            Translations: card.translations.map(t => ({ word: t } as Translation)),
            Contexts: card.context? card.context.map(c => ({
                original: c.sentence,
                translation: c.translation
            } as TranslationContext)) : [],
            TextView: card.info?.sentence ?? ""
        };
        return word;
    }
}
