import { z } from 'zod';

//#────────────────────────────────────────────────────────────────────────────────────────────────#
//#region                                    I18N COMMON ITEMS                                     #
//#────────────────────────────────────────────────────────────────────────────────────────────────#

//─────────────
// * CULTURE * 
//─────────────

export const Culture = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/);
export type Culture = z.infer<typeof Culture>;

//──────────────────────
// * LOCALIZED STRING *
//──────────────────────

//>      
//> > fr: Une chaîne localisée est une chaîne associée à une culture.
//> > en: A localized string is a string associated with a culture.
//>                                                                

export const LocalizedString = z.tuple([Culture, z.string()]);
export type LocalizedString = z.infer<typeof LocalizedString>;

//────────────────────────
// * LOCALIZABLE STRING * 
//────────────────────────

//>     
//> > fr: Une chaîne localisable est une liste de chaînes localisées représentant la même chaîne dans différentes cultures.                                                                                                         
//> > en: A localizable string is a list of localized strings representing the same string in different cultures.
//>                                                                                                              

export const LocalizableString = z.record(Culture, z.string());
export type LocalizableString = z.infer<typeof LocalizableString>;

//──────────────────────────
// * LOCALIZED STRING SET *
//──────────────────────────

//>
//> > fr: Un ensemble de chaînes localisées est un ensemble de chaînes associées à une culture.
//> > en: A set of localized strings is a set of strings associated with a culture.
//>

export const LocalizedStringSet = z.tuple([Culture, z.record(z.string())]);
export type LocalizedStringSet = z.infer<typeof LocalizedStringSet>;

//────────────────────────────
// * LOCALIZABLE STRING SET *
//────────────────────────────

export type StringSet = { [key: string]: z.ZodString };

//>
//> > fr: Un ensemble de chaînes localisables est un ensemble de chaînes localisées représentant la même chaîne dans différentes cultures.
//> > en: A set of localizable strings is a set of localized strings representing the same string in different cultures.
//>

/**
 * fr: Cette fonction permet de fabriquer un schéma Zod en fonction des besoins.
 * en: This function allows you to build a Zod schema according to your needs.
 * @param stringSet 
 * @returns 
 */
export function createLocalizableStringSet<T extends StringSet>(stringSet: z.ZodObject<T>) {
    return z.record(Culture, stringSet);
}

export type LocalizableStringSet = ReturnType<typeof createLocalizableStringSet>;
export const LocalizableStringSet: z.ZodSchema<LocalizableStringSet> = z.lazy(() => LocalizableStringSet);

//#────────────────────────────────────────────────────────────────────────────────────────────────#
//#endregion                                   I18N COMMON ITEMS                                   #
//#────────────────────────────────────────────────────────────────────────────────────────────────#

//#────────────────────────────────────────────────────────────────────────────────────────────────#
//#region                                      CODED MESSAGES                                      #
//#────────────────────────────────────────────────────────────────────────────────────────────────#

//>──────────────────────────────────────────────────────────────────────────────────<
//> fr: Les messages transitent sous forme de code, avec la traduction correspondant <
//> fr: à la culture de l'utilisateur dès qu'elle est connue.                        <
//> en: Messages are transmitted as code, with the translation corresponding to the  <
//> en: user's culture as soon as it is known.                                       <
//>──────────────────────────────────────────────────────────────────────────────────<

export enum MessageType {
    AccessDenied = 'AccessDenied',
    ProcessError = 'ProcessError',
    TechnicalIssue = 'TechnicalIssue',
    UnknownResource = 'UnknownResource',
    Warn = 'Warn',
}

export const Message = z.object({
    type: z.nativeEnum(MessageType),
    code: z.string(),
    parameters: z.record(z.string()).optional(),
    issuer: z.string().optional(),
    //>                                                                                                                                         
    //> > fr: À utiliser lorsqu'il y a un décalage entre la mise à disposition du dictionnaire et la connaisance de la culture de l'utilisateur.
    //> > en: To be used when there is a gap between the availability of the dictionary and the knowledge of the user's culture.
    //>                                                                                                                                         
    localizableStringSet: LocalizableStringSet.optional(),
    localizedstring: LocalizedString.optional(),
});
export type Message = z.infer<typeof Message>;

//#────────────────────────────────────────────────────────────────────────────────────────────────#
//#endregion                                    CODED MESSAGES                                     #
//#────────────────────────────────────────────────────────────────────────────────────────────────#