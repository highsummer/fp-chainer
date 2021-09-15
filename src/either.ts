import {Failure} from "./failure";

type EitherInternal<E, A> =
  {
    type: "left";
    e: E;
  } |
  {
    type: "right";
    a: A;
  };

function begin<E, A>(e: EitherInternal<E, A>): Either<E, A> {
  return new Either(e)
}

export function left<E>(e: E): Either<E, never> {
  return begin({ type: "left", e: e })
}

export function right<A>(a: A): Either<never, A> {
  return begin({ type: "right", a: a })
}

export function all<E, A>(es: Either<E, A>[]): Either<E, A[]> {
  return es.reduce<Either<E, A[]>>(
    (acc, e) => acc.chain(xs => e.map(x => [...xs, x])),
    right([] as A[]),
  )
}

export class Either<E, A> {
  constructor(protected internal: EitherInternal<E, A>) {}

  chain<F, B>(f: (a: A) => Either<F, B>): Either<E | F, B> {
    if (this.internal.type === "left") {
      return this as unknown as Either<E, B>
    } else {
      return f(this.internal.a)
    }
  }

  async chainAsync<F, B>(f: (a: A) => Promise<Either<F, B>>): Promise<Either<E | F, B>> {
    if (this.internal.type === "left") {
      return this as unknown as Either<E, B>
    } else {
      return await f(this.internal.a)
    }
  }

  map<B>(f: (a: A) => B): Either<E, B> {
    return this.chain((a: A) => right(f(a)))
  }

  async mapAsync<B>(f: (a: A) => Promise<B>): Promise<Either<E, B>> {
    return this.chainAsync(async (a: A) => right(await f(a)))
  }

  chainLeft<F, B>(f: (e: E) => Either<F, B>): Either<F, A | B> {
    if (this.internal.type === "left") {
      return f(this.internal.e)
    } else {
      return this as unknown as Either<F, A>
    }
  }

  async chainLeftAsync<F, B>(f: (e: E) => Promise<Either<F, B>>): Promise<Either<F, A | B>> {
    if (this.internal.type === "left") {
      return await f(this.internal.e)
    } else {
      return this as unknown as Either<F, A>
    }
  }

  mapLeft<F>(f: (e: E) => F): Either<F, A> {
    return this.chainLeft((e: E) => left(f(e)))
  }

  async mapLeftAsync<F>(f: (e: E) => Promise<F>): Promise<Either<F, A>> {
    return this.chainLeftAsync(async (e: E) => left(await f(e)))
  }

  fold<F, B>(f: (e: E) => Either<F, B>, g: (a: A) => Either<F, B>, ): Either<F, B> {
    if (this.internal.type === "left") {
      return f(this.internal.e) as unknown as Either<F, B>
    } else {
      return g(this.internal.a) as unknown as Either<F, B>
    }
  }

  async foldAsync<F, B>(f: (e: E) => Promise<Either<F, B>>, g: (a: A) => Promise<Either<F, B>>): Promise<Either<F, B>> {
    if (this.internal.type === "left") {
      return await f(this.internal.e) as unknown as Either<F, B>
    } else {
      return await g(this.internal.a) as unknown as Either<F, B>
    }
  }

  orElse(f: (e: E) => A): A {
    if (this.internal.type === "left") {
      return f(this.internal.e)
    } else {
      return this.internal.a
    }
  }

  orNull(): A | undefined {
    if (this.internal.type === "left") {
      return undefined
    } else {
      return this.internal.a
    }
  }

  eval(): EitherInternal<E, A> {
    return this.internal
  }

  getOrElse<B>(f: (a: A) => B, g: (e: E) => B): B {
    return this.map(f).orElse(g)
  }

  isRight(): boolean {
    return this.internal.type === "right"
  }

  isLeft(): boolean {
    return this.internal.type === "left"
  }
}

export class EitherComp<C extends string, X, K extends string, NS extends { [P in K]: NS[P] }> extends Either<Failure<C, X>, NS> {
  async bind<D extends string, L extends string, V>(key: L, f: (ns: NS) => Promise<Either<Failure<D, X>, V>>): Promise<EitherComp<C | D, X, K | L, Omit<NS, L> & Record<L, V>>> {
    if (this.internal.type === "left") {
      return this as unknown as EitherComp<C | D, X, K | L, Omit<NS, L> & Record<L, V>>
    } else {
      const ns = this.internal.a;
      const e = await f(ns);
      return e
        .map(r => new EitherComp<C | D, X, K | L, Omit<NS, L> & Record<L, V>>({ type: "right", a: { ...ns, [key]: r } as unknown as Omit<NS, L> & Record<L, V> }))
        .orElse(l => new EitherComp<C | D, X, K | L, Omit<NS, L> & Record<L, V>>({ type: "left", e: l }))
    }
  }

  async yield<B>(f: (ns: NS) => B): Promise<Either<Failure<C, X>, B>> {
    if (this.internal.type === "left") {
      return left(this.internal.e)
    } else {
      return right(f(this.internal.a))
    }
  }
}

export function empty<X>(): EitherComp<never, X, never, {}> {
  return new EitherComp<never, X, never, {}>({ type: "right", a: {} })
}

export function namespace<X>() {
  return function <K extends string, NS extends { [P in K]: NS[P] }>(ns: NS): EitherComp<never, X, K, NS> {
    return new EitherComp<never, X, K, NS>({ type: "right", a: ns })
  }
}

export function fromEither<C extends string, X, K extends string, NS extends { [P in K]: NS[P] }>(e: Either<Failure<C, X>, NS>): EitherComp<C, X, K, NS> {
  return e
    .map(ns => namespace<X>()(ns) as EitherComp<C, X, K, NS>)
    .orElse(exc => new EitherComp({ type: "left", e: exc }))
}
