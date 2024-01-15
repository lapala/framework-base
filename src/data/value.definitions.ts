import { z } from 'zod';

//#────────────────────────────────────────────────────────────────────────────────────────────────#
//#region                                    VALEURS CONCRÈTES                                     #
//#────────────────────────────────────────────────────────────────────────────────────────────────#

/**
 * fr: 
 * Représente la valeur de stockage d'une donnée.
 * Correspond aux valeurs JSON.
 * en:
 * Represents the storage value of a data.
 * Corresponds to JSON values.
 */
export const LapalaValue = z.union([z.string(), z.number(), z.boolean()]);
export type LapalaValue = z.infer<typeof LapalaValue>;

/**
 * fr:
 * Représente les valeurs de stockage d'une propriété.
 * Une propriété ne peut être que d'un type, et donc n'avoir que seul type de stockage 
 * correspondant à un type de valeur Lapala.
 * Les valeurs null sont autorisées pour des états transitoires non valides dans lesquels 
 * elles représentent l'absence d'une valeur obligatoire.
 * en:
 * Represents the storage values of a property.
 * A property can only be of one type, and therefore have only one storage type
 * Null values are allowed for invalid transient states in which they represent 
 * the absence of a required value.
 */
export const LapalaPropertyValues = z.union([
    z.string().or(z.null()).array(),
    z.number().or(z.null()).array(),
    z.boolean().or(z.null()).array(),
]);
export type LapalaPropertyValues = z.infer<typeof LapalaPropertyValues>;

// % fr: Toutes les données sont représentées par des objets dont les propriétés sont des tableaux.
export type LapalaObject = { [key: string]: (LapalaObject[] | LapalaPropertyValues) };
export const LapalaObject: z.ZodSchema<LapalaObject> = z.lazy(() => z.record(LapalaObject.array().or(LapalaPropertyValues)));

//#────────────────────────────────────────────────────────────────────────────────────────────────#
//#endregion                                   VALEURS CONCRÈTES                                   #
//#────────────────────────────────────────────────────────────────────────────────────────────────#