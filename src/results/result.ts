/* eslint-disable @typescript-eslint/no-unused-vars */
//>──────────────────────────────────────────────────────────────────────────────<
//> Ce code est librement inspiré de Either, Copyright (c) 2018, Stanislav Iliev <
//>──────────────────────────────────────────────────────────────────────────────<

import { Message, MessageType } from '../i18n/definitions';

/**
 * fr: 
 * Classe de base d'un résultat de fonction dans Lapala, représentant un succès ou un échec,
 * avec dans les deux cas la possibilité de retourner des avertissements.
 */
export abstract class Result<S> {

    protected constructor(
        warnings?: Message[],
    ) {
        this.warnings = warnings;
    }

    //#────────────────────────────────────────────────────────────────────────────────────────────────#
    //#region                                GESTION DES AVERTISSEMENTS                                #
    //#────────────────────────────────────────────────────────────────────────────────────────────────#

    warnings?: Message[];

    /**
     * fr:
     * Permet de reporter simplement les avertissements d'un résultat dans un autre résultat.
     * @param warnings 
     * @returns 
     */
    public addWarnings(warnings?: Message[]): this {
        if (warnings && warnings.length) {
            if (this.warnings) {
                this.warnings.push(...warnings);
            } else {
                this.warnings = warnings;
            }
        }
        return this;
    }

    //#────────────────────────────────────────────────────────────────────────────────────────────────#
    //#endregion                              GESTION DES AVERTISSEMENTS                               #
    //#────────────────────────────────────────────────────────────────────────────────────────────────#

    //#────────────────────────────────────────────────────────────────────────────────────────────────#
    //#region                                   FONCTIONS STATIQUES                                    #
    //#────────────────────────────────────────────────────────────────────────────────────────────────#

    /**
     * fr: 
     * Permet d'exécuter une fonction lambda et de l'intégrer dans un flux audité.
     * Par conséquent, ce type d'appel ne peut pas générer d'avertissement.
     * en:
     * Allows to execute non programmatical function and to begin audited flow.
     * Note that no warning is expected from the "native" function.
     * @param inner Native function.
     * @param failure Failure result to return in case of exception.
     * @returns Audited result.
     */
    static encase<X>(inner: () => X, failure: (reason: unknown) => Failure): Result<X> {
        try {
            return new Success<X>(inner());
        } catch (e) {
            return failure(e);
        }
    }

    /**
     * fr:
     * Permet d'exécuter une liste de résultats en s'arrêtant au premier échec.
     * Les avertissements sont conservés jusqu'au résultat.
     * @param list 
     * @returns 
     */
    static sequence<X>(list: Result<X>[]): Result<X[]> {
        const result: X[] = [];
        const warnings: Message[] = [];
        for (const item of list) {
            if (item.warnings?.length) {
                warnings.push(...item.warnings);
            }
            if (item.isFailure()) {
                return (item as Failure).addWarnings(warnings);
            }
            result.push((item as Success<X>).value);
        }
        return new Success(result).addWarnings(warnings);
    }

    /**
     * fr:
     * Permet d'exécuter une liste de résultats en conservant tous les échecs.
     * Les avertissements sont conservés.
     * @param list 
     * @returns 
     */
    static sequenceWithAllFailures<X>(list: Result<X>[]): Result<X[]> {
        const result: X[] = [];
        const warnings: Message[] = [];
        let failure: Failure | undefined;
        for (const item of list) {
            if (item.warnings?.length) {
                warnings.push(...item.warnings);
            }
            if (item.isFailure()) {
                const currentFailure = item as Failure;
                if (failure === undefined) {
                    failure = currentFailure;
                } else {
                    failure.errors.push(...currentFailure.errors);
                }
            } else {
                result.push((item as Success<X>).value);
            }
        }
        if (failure === undefined) {
            return new Success(result).addWarnings(warnings);
        } else {
            return failure.addWarnings(warnings);
        }
    }

    /**
     * fr:
     * Permet d'exécuter une liste de résultats en transformant les échecs en avertissements.
     * Les avertissements sont conservés.
     * @param list 
     * @returns 
     */
    static sequenceWithoutFailure<X>(list: Result<X>[]): Success<X[]> {
        const result: X[] = [];
        const warnings: Message[] = [];
        for (const item of list) {
            if (item.warnings?.length) {
                warnings.push(...item.warnings);
            }
            if (item.isFailure()) {
                warnings.push(...(item as Failure).errors);
            } else {
                result.push((item as Success<X>).value);
            }
        }
        return new Success(result).addWarnings(warnings);
    }

    /**
     * fr:
     * Permet d'exécuter une liste de résultats en s'arrêtant au premier succès respectant une condition.
     * Les avertissements sont conservés.
     * @param list 
     * @param condition 
     * @returns 
     */
    static first<X>(list: X[], condition: (value: X) => Result<boolean>): Result<X | undefined> {
        for (const item of list) {
            const result = condition(item);
            if (result.isFailure()) {
                return result as Failure;
            } else if ((result as Success<boolean>).value) {
                return (new Success(item)).addWarnings(result.warnings);
            }
        }
        return new Success(undefined);
    }

    //#────────────────────────────────────────────────────────────────────────────────────────────────#
    //#endregion                                  FONCTIONS STATIQUES                                  #
    //#────────────────────────────────────────────────────────────────────────────────────────────────#


    //───────────────────────
    // * FONCTIONS DE TEST * 
    //───────────────────────

    abstract isFailure(): boolean;

    abstract isSuccess(): boolean;

    //─────────────────────────────
    // * FONCTIONS D'EXPLORATION * 
    //─────────────────────────────

    //>────────────────────────────────────────────────────────────────────────────────────<
    //> fr: Les fonctions d'exploration permettent d'observer un résultat sans le changer. <
    //>────────────────────────────────────────────────────────────────────────────────────<

    public observe(f: (result: Result<S>) => void): Result<S> {
        f(this);
        return this;
    }

    //───────────────────────────
    // * FONCTIONS DE TYPE MAP * 
    //───────────────────────────

    //>─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────<
    //> Les fonctions de type map permettent de transformer un résultat en un résultat de même type (succès pour succès, échec pour échec). <
    //>─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────<

    abstract mapSuccess<S2>(onSuccess: (value: S) => Success<S2>): Result<S2>;

    abstract mapFailure(onFailure: (errors: Message[]) => Failure): Result<S>;

    abstract mapBoth<S2>(onFailure: (errors: Message[]) => Failure, onSuccess: (value: S) => Success<S2>): Result<S2>;

    //─────────────────────────────
    // * FONCTIONS DE TYPE CHAIN * 
    //─────────────────────────────

    //>─────────────────────────────────────────────────────────────────────────────────────────<
    //> Les fonctions de type chain permettent de transformer un résultat en un autre résultat. <
    //>─────────────────────────────────────────────────────────────────────────────────────────<

    abstract chainSuccess<S2>(next: (value: S) => Result<S2>): Result<S2>;

    abstract chainFailure<S2>(next: (errors: Message[]) => Result<S2>): Result<S | S2>;

    abstract chainBoth<S2, S3>(onFailure: (errors: Message[]) => Result<S2>, onSuccess: (value: S) => Result<S3>): Result<S2 | S3>;

    //──────────────────────
    // * AUTRES FONCTIONS * 
    //──────────────────────

    /**
     * fr:
     * Permet de transformer les erreurs en avertissements en précisant si la valeur du résultat doit être transformée en booléen
     * reflétant l'existence d'un échec. 
     * @param withErrorFlag 
     */
    abstract downgradeErrorsToWarnings(withErrorFlag?: boolean): Success<S | boolean>;

    /**
     * fr:
     * Permet de récupérer tous les messages d'un résultat, c'est à dire les avertissements pour un succès, et les avertissements et les erreurs
     * pour un échec.
     */
    abstract getAllMessages(): Message[];
}

/**
 * fr:
 * Classe représentant un succès.
 */
export class Success<S> extends Result<S> {
    readonly value: S;

    constructor(
        value: S,
        warnings?: Message[],
    ) {
        super(warnings);
        this.value = value;
    }

    isFailure(): boolean {
        return false;
    }

    isSuccess(): boolean {
        return true;
    }

    mapSuccess<S2>(onSuccess: (value: S) => Success<S2>): Result<S2> {
        return onSuccess(this.value).addWarnings(this.warnings);
    }

    mapFailure(onFailure: (errors: Message[]) => Failure): Result<S> {
        return this as Result<S>;
    }

    mapBoth<S2>(onFailure: (errors: Message[]) => Failure, onSuccess: (value: S) => Success<S2>): Result<S2> {
        return onSuccess(this.value).addWarnings(this.warnings);
    }

    chainSuccess<S2>(next: (value: S) => Result<S2>): Result<S2> {
        return next(this.value).addWarnings(this.warnings);
    }

    chainFailure<S2>(next: (errors: Message[]) => Result<S2>): Result<S | S2> {
        return this;
    }

    chainBoth<S2, S3>(onFailure: (errors: Message[]) => Result<S2>, onSuccess: (value: S) => Result<S3>): Result<S2 | S3> {
        return onSuccess(this.value).addWarnings(this.warnings);
    }

    downgradeErrorsToWarnings(withErrorFlag?: boolean): Success<S | boolean> {
        if (withErrorFlag) {
            return this.mapSuccess(() => new Success(true)) as Success<boolean>;
        }
        return this;
    }

    getAllMessages(): Message[] {
        return this.warnings ?? [];
    }
}

/**
 * fr:
 * Classe représentant un échec.
 */
export class Failure<S = never> extends Result<S> {
    readonly errors: Message[];

    constructor(
        errors: Message[],
        warnings?: Message[],
    ) {
        super(warnings);
        this.errors = errors;
    }

    static single(code: string, parameters?: Record<string, string>, issuer?: string, type: MessageType = MessageType.ProcessError): Failure {
        return new Failure([{
            code,
            parameters,
            issuer,
            type,
        }]);
    }

    isFailure(): boolean {
        return true;
    }

    isSuccess(): boolean {
        return false;
    }

    mapSuccess<S2>(_: (value: S) => Success<S2>): Result<S2> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this as any;
    }

    mapFailure(onFailure: (errors: Message[]) => Failure): Result<S> {
        return onFailure(this.errors).addWarnings(this.warnings);
    }

    mapBoth<S2>(onFailure: (errors: Message[]) => Failure, onSuccess: (value: S) => Success<S2>): Result<S2> {
        return onFailure(this.errors).addWarnings(this.warnings);
    }

    chainSuccess<S2>(next: (value: S) => Result<S2>): Result<S2> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this as any;
    }

    chainFailure<S2>(next: (errors: Message[]) => Result<S2>): Result<S | S2> {
        return next(this.errors).addWarnings(this.warnings);
    }

    chainBoth<S2, S3>(onFailure: (errors: Message[]) => Result<S2>, onSuccess: (value: S) => Result<S3>): Result<S2 | S3> {
        return onFailure(this.errors).addWarnings(this.warnings);
    }

    downgradeErrorsToWarnings(withErrorFlag?: boolean): Success<S | boolean> {
        return new Success<boolean>(withErrorFlag ?? true).addWarnings(this.errors);
    }

    getAllMessages(): Message[] {
        if (this.warnings === undefined) {
            return this.errors;
        } else {
            return [...this.errors, ...this.warnings];
        }
    }
}

