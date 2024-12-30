import SupportedLanguages, { SupportedLanguage } from './languages/entities/languages';
import languages from './languages/languagesTranslate';
import { getRandom } from 'random-useragent';
import { Parser } from 'htmlparser2';
import * as domutils from 'domutils';
import { DomHandler, Element } from 'domhandler';
import Translation from './languages/entities/translation';
import TranslationContext from './languages/entities/translationContext';

export interface ResponseTranslation{
    Original:string,
    Translations:Translation[],
    Contexts:TranslationContext[],
    TextView:string,
    Book:string
}

export interface SentenceTranslation{
  Original: string,
  Translation: string
}

export default class Reverso {
  private TRANSLATION_URL = 'https://api.reverso.net/translate/v1/translation';
  private MAX_WORDS_IN_CONTEXT = 20;

  private extractEmphasisContent(text: string): string {
    const match = text.match(/<em>(.*?)<\/em>/);
    return match ? match[1] : '';
  }

  private countWords(text: string): number {
    // Remove HTML tags and trim
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    // Split by whitespace and filter out empty strings
    return cleanText.split(/\s+/).filter(word => word.length > 0).length;
  }

  private isContextValid(
    context: TranslationContext, 
    translations: Translation[]
  ): boolean {
    // Extract emphasized word from the original context
    const emphasizedWord = this.extractEmphasisContent(context.translation);
    
    // Check if the emphasized word exists in translations
    const hasMatchingTranslation = translations.some(
      translation => translation.word.toLowerCase() === emphasizedWord.toLowerCase()
    );
    const isOriginalLengthValid = this.countWords(context.original) <= this.MAX_WORDS_IN_CONTEXT;
    const isTranslationLengthValid = this.countWords(context.translation) <= this.MAX_WORDS_IN_CONTEXT;

    return hasMatchingTranslation && isOriginalLengthValid && isTranslationLengthValid;
  }

  async getContextFromWebPage(
    text: string,
    source: SupportedLanguage = SupportedLanguages.ENGLISH,
    target: SupportedLanguage = SupportedLanguages.RUSSIAN
  ): Promise<ResponseTranslation> {
    const url = `https://context.reverso.net/translation/${source}-${target}/${encodeURIComponent(text)}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandom(),
          'Accept': '*/*',
          'Connection': 'keep-alive',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const translations = await this.parseTranslations(html);
      const allContexts = await this.parseContexts(html);
      
      // Filter contexts based on our criteria
      const filteredContexts = allContexts.filter(context => 
        this.isContextValid(context, translations)
      );
      const transResponse: ResponseTranslation = {
        Original: text,
        Translations: translations,
        Contexts: filteredContexts,
        TextView: "", 
        Book: ""     
      }
    
      return transResponse;
    } catch (error) {
      console.error('Error fetching or parsing translations:', error);
      throw error;
    }
  }

  private parseTranslations(html: string): Promise<Translation[]> {
    return new Promise((resolve, reject) => {
      const handler = new DomHandler((error, dom) => {
        if (error) {
          reject(error);
          return;
        }
  
        const translationElements = domutils.findAll(
          (element): boolean => {
            return element.type === 'tag' && 
                   element.attribs !== undefined &&
                   element.attribs.class !== undefined &&
                   element.attribs.class.includes('translation');
          },
          dom as Element[]
        );
  
        const translations = translationElements.map((element) => {
          let word = '';
          let pos = '';
  
          // Find the word
          const displayTerm = domutils.findOne(
            (el): boolean => el.type === 'tag' && el.attribs !== undefined && el.attribs.class === 'display-term',
            element.children as Element[]
          );
          if (displayTerm) {
            word = domutils.getText(displayTerm).trim();
          }
  
          // Find the part of speech
          const posMarkElement = domutils.findOne(
            (el): boolean => el.type === 'tag' && el.attribs !== undefined && el.attribs.class === 'pos-mark',
            element.children as Element[]
          );
          if (posMarkElement) {
            const posSpan = domutils.findOne(
              (el): boolean => el.type === 'tag' && el.name === 'span' && el.attribs !== undefined && el.attribs.title !== undefined,
              posMarkElement.children as Element[]
            );
            if (posSpan && posSpan.attribs && posSpan.attribs.title) {
              pos = posSpan.attribs.title.trim();
            }
          }
  
          return { word, pos };
        });
  
        resolve(translations.filter(t => t.word !== ''));
      });
  
      const parser = new Parser(handler);
      parser.write(html);
      parser.end();
    });
  }

  private parseContexts(html: string): Promise<TranslationContext[]> {
    return new Promise((resolve, reject) => {
      const handler = new DomHandler((error, dom) => {
        if (error) {
          reject(error);
          return;
        }
  
        const exampleElements = domutils.findAll(
          (element): boolean => {
            return element.type === 'tag' && 
                   element.attribs !== undefined &&
                   element.attribs.class !== undefined &&
                   element.attribs.class.includes('example');
          },
          dom as Element[]
        );
  
        const translations = exampleElements.map((element) => {
          const srcElement = domutils.findOne(
            (el): boolean => el.type === 'tag' && el.attribs !== undefined && el.attribs.class === 'src ltr',
            element.children as Element[]
          );
  
          const trgElement = domutils.findOne(
            (el): boolean => el.type === 'tag' && el.attribs !== undefined && el.attribs.class === 'trg ltr',
            element.children as Element[]
          );
  
          let original = '';
          let translation = '';
  
          if (srcElement) {
            const textElement = domutils.findOne(
              (el): boolean => el.type === 'tag' && el.name === 'span' && el.attribs !== undefined && el.attribs.class === 'text',
              srcElement.children as Element[]
            );
            if (textElement) {
              original = this.getTextWithEmphasis(textElement);
            }
          }
  
          if (trgElement) {
            const textElement = domutils.findOne(
              (el): boolean => el.type === 'tag' && el.name === 'span' && el.attribs !== undefined && el.attribs.class === 'text',
              trgElement.children as Element[]
            );
            if (textElement) {
              translation = this.getTextWithEmphasis(textElement);
            }
          }
  
          return { original, translation };
        });
  
        resolve(translations.filter(t => t.original !== '' && t.translation !== ''));
      });
  
      const parser = new Parser(handler);
      parser.write(html);
      parser.end();
    });
  }
  
  private getTextWithEmphasis(element: Element): string {
    return element.children.map(child => {
      if (child.type === 'text') {
        return child.data;
      } else if (child.type === 'tag' && child.name === 'em') {
        return `<em>${domutils.getText(child)}</em>`;
      } else if (child.type === 'tag' && child.name === 'a' && child.attribs.class === 'link_highlighted') {
        const emElement = domutils.findOne(
          (el): boolean => el.type === 'tag' && el.name === 'em',
          child.children as Element[]
        );
        if (emElement) {
          return `<em>${domutils.getText(emElement)}</em>`;
        }
      }
      return '';
    }).join('').trim();
  }

  async getTranslationFromAPI(
    text: string,
    source: SupportedLanguage = SupportedLanguages.ENGLISH,
    target: SupportedLanguage = SupportedLanguages.RUSSIAN
  ): Promise<SentenceTranslation> {
    const response = await fetch(this.TRANSLATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': getRandom(),
        'Accept': '*/*',
        'Connection': 'keep-alive',
      },
      body: JSON.stringify({
        format: 'text',
        from: languages[source],
        input: text,
        options: {
          contextResults: true,
          languageDetection: true,
          origin: 'reversomobile',
          sentenceSplitter: false,
        },
        to: languages[target],
      }),
    });
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    let result = await response.text();
    const translationObj = JSON.parse(result);
    const translatedText = String(translationObj["translation"]);
    const translation : SentenceTranslation  = {
      Original : text,
      Translation : translatedText
    }
    return translation;
  }
}