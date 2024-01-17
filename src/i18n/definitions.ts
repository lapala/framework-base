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

export type StringSet = z.ZodObject<Record<string, z.ZodString>>;

//>
//> > fr: Un ensemble de chaînes localisables est un ensemble de chaînes localisées représentant les mêmes chaînes dans différentes cultures.
//> > en: A set of localizable strings is a set of localized strings representing the same strings in different cultures.
//>

/**
 * fr: Cette fonction permet de fabriquer un schéma Zod en fonction des besoins.
 * en: This function allows you to build a Zod schema according to your needs.
 * @param stringSet 
 * @returns 
 */
export function createLocalizableStringSet<T extends StringSet>(stringSet: T) {
    return z.record(Culture, stringSet);
}

//────────────────────────
// * COMMON STRING SETS * 
//────────────────────────

// * fr: uniquement un nom

export const SimpleStringSet = z.object({
    name: z.string(),
});
export type SimpleStringSet = z.infer<typeof SimpleStringSet>;

export const SimpleLocalizableStringSet = createLocalizableStringSet(SimpleStringSet);
export type SimpleLocalizableStringSet = z.infer<typeof SimpleLocalizableStringSet>;

// * fr: version extensible

export const ExtensibleSimpleStringSet = SimpleStringSet.catchall(z.string());
export type ExtensibleSimpleStringSet = z.infer<typeof ExtensibleSimpleStringSet>;

export const ExtensibleSimpleLocalizableStringSet = createLocalizableStringSet(ExtensibleSimpleStringSet);
export type ExtensibleSimpleLocalizableStringSet = Record<Culture, ExtensibleSimpleStringSet>;

// * fr: nom et description

export const StandardStringSet = z.object({
    name: z.string(),
    description: z.string(),
});
export type StandardStringSet = z.infer<typeof StandardStringSet>;

export const StandardLocalizableStringSet = createLocalizableStringSet(StandardStringSet);
export type StandardLocalizableStringSet = z.infer<typeof StandardLocalizableStringSet>;

// * fr: version extensible

export const ExtensibleStandardStringSet = StandardStringSet.catchall(z.string());
export type ExtensibleStandardStringSet = z.infer<typeof ExtensibleStandardStringSet>;

export const ExtensibleStandardLocalizableStringSet = createLocalizableStringSet(ExtensibleStandardStringSet);
export type ExtensibleStandardLocalizableStringSet = Record<Culture, ExtensibleStandardStringSet>;

//#────────────────────────────────────────────────────────────────────────────────────────────────#
//#endregion                                   I18N COMMON ITEMS                                   #
//#────────────────────────────────────────────────────────────────────────────────────────────────#

//#────────────────────────────────────────────────────────────────────────────────────────────────#
//#region                                      CODED MESSAGES                                      #
//#────────────────────────────────────────────────────────────────────────────────────────────────#

//>──────────────────────────────────────────────────────────────────────────────<
//> fr:                                                                          <
//> Les messages transitent sous forme de code, avec la traduction correspondant <
//> à la culture de l'utilisateur dès qu'elle est connue.                        <
//> en:                                                                          <
//> Messages are transmitted as code, with the translation corresponding to the  <
//> user's culture as soon as it is known.                                       <
//>──────────────────────────────────────────────────────────────────────────────<

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
    localizableString: LocalizableString.optional(),
    localizedString: LocalizedString.optional(),
});
export type Message = z.infer<typeof Message>;

//#────────────────────────────────────────────────────────────────────────────────────────────────#
//#endregion                                    CODED MESSAGES                                     #
//#────────────────────────────────────────────────────────────────────────────────────────────────#