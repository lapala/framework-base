//>───────────────────────────────────────────────────────────────────────────────────<
//> Ce code est librement inspiré de EitherAsync, Copyright (c) 2018, Stanislav Iliev <
//>───────────────────────────────────────────────────────────────────────────────────<

import { Message, MessageType } from '../i18n/definitions';
import { Failure, Result, Success } from './result';

export type ResultAsyncValue<S> = PromiseLike<Success<S>>;

export interface ResultAsyncHelpers {
    //>                                                          
    //> > fr: Crée un résultat asynchrone à partir d'un Result.
    //>                                                          
    liftResult<S>(result: Result<S>): ResultAsyncValue<S>;
    //>                                            
    //> > fr: Crée un succès à partir d'une valeur.
    //>                                            
    liftSuccess<S>(value: S): ResultAsyncValue<S>;
    //>                                           
    //> > fr: Crée un échec à partir d'un message.
    //>                                           
    liftFailure(code: string, parameters?: Record<string, string>, issuer?: string, type?: MessageType): ResultAsyncValue<never>;
    //>                                                                      
    //> > fr: Crée un résultat asynchrone à partir d'une promise de Result.
    //>                                                                      
    fromResultPromise<S>(promise: PromiseLike<Result<S>>): ResultAsyncValue<S>;
    //>                                                                     
    //> > fr: Crée un résultat asynchrone à partir d'une promise quelconque.
    //>                                                                     
    fromPromise<S>(promise: PromiseLike<S>, failure: (reason: unknown) => Failure): ResultAsyncValue<S>;
}

const resultAsyncHelpers: ResultAsyncHelpers = {
    liftResult<S>(result: Result<S>): ResultAsyncValue<S> {
        if (result.isSuccess()) {
            return Promise.resolve(result as Success<S>);
        }
        throw result as Failure;
    },
    liftSuccess<S>(value: S): ResultAsyncValue<S> {
        return Promise.resolve(new Success(value));
    },
    liftFailure(code: string, parameters?: Record<string, string>, issuer?: string, type: MessageType = MessageType.ProcessError): never {
        throw Failure.single(code, parameters, issuer, type);
    },
    fromResultPromise<S>(promise: PromiseLike<Result<S>>): ResultAsyncValue<S> {
        return promise.then(resultAsyncHelpers.liftResult) as ResultAsyncValue<S>;
    },
    fromPromise<S>(promise: PromiseLike<S>, failure: (reason: unknown) => Failure): ResultAsyncValue<S> {
        return promise.then(
            (result) => resultAsyncHelpers.liftResult(new Success(result)),
            (reason) => resultAsyncHelpers.liftResult(typeof failure === 'function' ? failure(reason) : failure),
        );
    },
};

export interface ResultAsync<S> extends PromiseLike<Result<S>> {
    run(): Promise<Result<S>>;
    observe(on: (result: Result<S>) => void): ResultAsync<S>;
    mapSuccess<S2>(onSuccess: (value: S) => Success<S2>): ResultAsync<S2>;
    mapFailure(onFailure: (errors: Message[]) => Failure): ResultAsync<S>;
    mapBoth<S2>(onFailure: (errors: Message[]) => Failure, onSuccess: (value: S) => Success<S2>): ResultAsync<S2>;
    chain<S2>(next: (result: Result<S>) => PromiseLike<Result<S2>>): ResultAsync<S2>;
    chainSuccess<S2>(next: (value: S) => PromiseLike<Result<S2>>): ResultAsync<S2>;
    chainFailure<S2>(next: (errors: Message[]) => PromiseLike<Result<S2>>): ResultAsync<S | S2>;
    chainBoth<S2, S3>(nextFailure: (errors: Message[]) => PromiseLike<Result<S2>>, nextSuccess: (value: S) => PromiseLike<Result<S3>>): ResultAsync<S2 | S3>;
}

class ResultAsyncImpl<S> implements ResultAsync<S> {
    constructor(
        private runPromise: (helpers: ResultAsyncHelpers) => PromiseLike<Success<S>>,
    ) { }

    async run(): Promise<Result<S>> {
        try {
            return await this.runPromise(resultAsyncHelpers);
        } catch (e) {
            //>─────────────────────────────────────────────────────────────────────────────────────<
            //> fr:                                                                                 <
            //> Seules des Failures sont attendues ici.                                             <
            //> Si ce n'est pas le cas, c'est qu'une fonction n'est pas appelée de manière auditée. <
            //>─────────────────────────────────────────────────────────────────────────────────────<
            if (e instanceof Error) {
                //> ?! ─────────────────────────────────────────────────────── ?!
                //> ?! fr: Une exception a été émise en dehors du flux audité. ?!
                //> ?! ─────────────────────────────────────────────────────── ?!
                // ! Elle est transformée en Failure mais doit absolument être traitée dans le code d'origine pour ne plus arriver telle quelle.
                return Failure.single('catchedError', { name: e.name, message: e.message, stack: e.stack ?? '' }, 'lapala', MessageType.TechnicalIssue);
            } else if (e instanceof Failure) {
                //> ?! ──────────────── ?!
                //> ?! fr: Cas nominal. ?!
                //> ?! ──────────────── ?!
                return e;
            }
            //> ?! ───────────────────────────────────────────────────────────────────────────────────────────── ?!
            //> ?! fr: Cas improbable : une exception a été émise sans que ce soit ni une Error, ni une Failure. ?!
            //> ?! ───────────────────────────────────────────────────────────────────────────────────────────── ?!
            return Failure.single('unknownErrorType', { error: JSON.stringify(e) }, 'lapala', MessageType.TechnicalIssue);
        }
    }

    /**
     * Allows to observe result and do some stuff without altering it.
     * May alter its warnings nevertheless.
     * @param f
     * @returns
     */
    observe(f: (result: Result<S>) => void): ResultAsync<S> {
        return ResultAsync(async ({ liftResult }) => liftResult((await this.run()).observe(f)));
    }

    mapBoth<S2>(onFailure: (errors: Message[]) => Failure, onSuccess: (value: S) => Success<S2>): ResultAsync<S2> {
        return ResultAsync(async (helpers) => {
            const result = await this.run();
            return helpers.liftResult(result.mapBoth(onFailure, onSuccess));
        });
    }

    mapSuccess<S2>(onSuccess: (value: S) => Success<S2>): ResultAsync<S2> {
        return ResultAsync(async (helpers) => {
            const result = await this.run();
            return helpers.liftResult(result.mapSuccess(onSuccess));
        });
    }

    mapFailure(onFailure: (value: Message[]) => Failure): ResultAsync<S> {
        return ResultAsync(async (helpers) => {
            try {
                return await this.runPromise(helpers);
            } catch (e) {
                // NOTE e must be a Failure here.
                const failure = e as Failure;
                throw onFailure(failure.errors).addWarnings(failure.warnings);
            }
        });
    }

    chain<S2>(next: (result: Result<S>) => PromiseLike<Result<S2>>): ResultAsync<S2> {
        return ResultAsync(async (helpers) => {
            const result = await this.run();
            return helpers.fromResultPromise(next(result).then((nextResult) => nextResult.addWarnings(nextResult.warnings)));
        });
    }

    chainSuccess<S2>(next: (value: S) => PromiseLike<Result<S2>>): ResultAsync<S2> {
        return ResultAsync(async (helpers) => {
            const success = await this.runPromise(helpers);
            return helpers.fromResultPromise(next(success.value).then((result) => result.addWarnings(success.warnings)));
        });
    }

    chainFailure<S2>(
        next: (value: Message[]) => PromiseLike<Result<S2>>,
    ): ResultAsync<S | S2> {
        return ResultAsync<S | S2>(async (helpers) => {
            try {
                return await this.runPromise(helpers);
            } catch (e) {
                // NOTE e must be a Failure here.
                const failure = e as Failure;
                return helpers.fromResultPromise(next(failure.errors).then((success) => success.addWarnings(failure.warnings)));
            }
        });
    }

    chainBoth<S2, S3>(
        nextFailure: (errors: Message[]) => PromiseLike<Result<S2>>,
        nextSuccess: (value: S) => PromiseLike<Result<S3>>,
    ): ResultAsync<S2 | S3> {
        return ResultAsync<S2 | S3>(async (helpers) => {
            let inputPromiseIsSuccessful = false;
            try {
                const success = await this.runPromise(helpers);
                inputPromiseIsSuccessful = true;
                return await helpers.fromResultPromise(nextSuccess(success.value).then((result) => result.addWarnings(success.warnings)));
            } catch (e) {
                // NOTE e must be a Failure here.
                const failure = e as Failure;
                if (inputPromiseIsSuccessful) {
                    return helpers.liftResult(failure);
                }
                return helpers.fromResultPromise(nextFailure(failure.errors).then((success) => success.addWarnings(failure.warnings)));
            }
        });
    }

    then: PromiseLike<Result<S>>['then'] = (onfulfilled, onrejected) => this.run().then(onfulfilled, onrejected);
}

interface ResultAsyncTypeRef {
    <S>(
        runPromise: (helpers: ResultAsyncHelpers) => PromiseLike<Success<S>>
    ): ResultAsync<S>;
    liftResult<S>(result: Result<S>): ResultAsync<S>;
    liftSuccess<S>(value: S): ResultAsync<S>;
    liftFailure(code: string, parameters?: Record<string, string>, issuer?: string, type?: MessageType): ResultAsync<never>;
    check<S>(condition: boolean, success: S, failure: Failure): ResultAsync<S>;
    if<S>(condition: boolean, ifResult: ResultAsync<S>): ResultAsync<S | false>;
    ifElse<S1, S2>(condition: boolean, ifResult: ResultAsync<S1>, elseResult: ResultAsync<S2>): ResultAsync<S1 | S2>;
    fromResultPromise<S>(promise: () => PromiseLike<Result<S>>): ResultAsync<S>;
    fromPromise<S>(promise: () => PromiseLike<S>, failure: (reason: unknown) => Failure): ResultAsync<S>;
    allMustSuccess<S>(list: ResultAsync<S>[]): ResultAsync<S[]>;
    someMayFail<S>(list: ResultAsync<S>[]): ResultAsync<S[]>;
    all<S>(list: ResultAsync<S>[]): ResultAsync<S[]>;
    first<S>(list: S[], condition: (value: S) => ResultAsync<boolean>): ResultAsync<S | undefined>;
}

export const ResultAsync: ResultAsyncTypeRef = Object.assign(
    <S>(
        runPromise: (helpers: ResultAsyncHelpers) => PromiseLike<Success<S>>,
    ): ResultAsync<S> => new ResultAsyncImpl(runPromise),
    {
        liftResult: <S>(result: Result<S>): ResultAsync<S> => ResultAsync(({ liftResult }) => liftResult(result)),
        liftSuccess: <S>(value: S): ResultAsync<S> => ResultAsync(({ liftResult }) => liftResult(new Success(value))),
        liftFailure: (code: string, parameters?: Record<string, string>, issuer?: string, type?: MessageType): ResultAsync<never> => ResultAsync(({ liftFailure }) => liftFailure(code, parameters, issuer, type)),
        check: <S>(condition: boolean, success: S, failure: Failure): ResultAsync<S> => ResultAsync.liftResult(condition ? new Success(success) : failure),
        if: <S>(condition: boolean, ifResult: ResultAsync<S>): ResultAsync<S | false> => condition ? ifResult : ResultAsync.liftSuccess(false),
        ifElse: <S1, S2>(condition: boolean, ifResult: ResultAsync<S1>, elseResult: ResultAsync<S2>): ResultAsync<S1 | S2> => condition ? ifResult : elseResult,
        fromResultPromise: <S>(promise: () => PromiseLike<Result<S>>): ResultAsync<S> => ResultAsync(({ fromResultPromise }) => fromResultPromise(promise())),
        fromPromise: <S>(promise: () => PromiseLike<S>, failure: (reason: unknown) => Failure): ResultAsync<S> => ResultAsync(({ fromPromise }) => fromPromise(promise(), failure)),
        allMustSuccess: <S>(list: ResultAsync<S>[]): ResultAsync<S[]> => ResultAsync.fromResultPromise(() => Promise.all(list).then(Result.sequence)),
        someMayFail: <S>(list: ResultAsync<S>[]): ResultAsync<S[]> => ResultAsync.fromResultPromise(() => Promise.all(list).then(Result.sequenceWithoutFailure)),
        all: <S>(list: ResultAsync<S>[]): ResultAsync<S[]> => ResultAsync.fromResultPromise(() => Promise.all(list).then(Result.sequenceWithAllFailures)),
        first: <S>(list: S[], condition: (value: S) => ResultAsync<boolean>): ResultAsync<S | undefined> => ResultAsync(async ({ liftSuccess, liftResult }) => {
            for (const item of list) {
                // eslint-disable-next-line no-await-in-loop
                const result = await condition(item);
                if (result.isFailure()) {
                    return liftResult(result as Failure);
                } else if ((result as Success<boolean>).value) {
                    return liftSuccess(item);
                }
            }
            return liftSuccess(undefined);
        }),
    },
);

ResultAsyncImpl.prototype.constructor = ResultAsync;
