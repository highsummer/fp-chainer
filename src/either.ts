import {Failure} from "./failure";
import {Must} from "./must";

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

  intoMust(or: A): Must<E, A> {
    return this.getOrElse(
      a => new Must<E, A>(a, []),
      e => new Must<E, A>(or, [e]),
    )
  }
}

type Insert<NS extends { [P in K]: NS[P] }, L extends string, V, K extends keyof NS & string = keyof NS & string> = { [P in L | K]: P extends L ? V : P extends keyof NS ? NS[P] : never };

export class EitherComp<C extends string, X, K extends string, NS extends { [P in K]: NS[P] }> {
  internal: Promise<Either<Failure<C, X>, NS>>;

  constructor(initial: Either<Failure<C, X>, NS> | Promise<Either<Failure<C, X>, NS>>) {
    this.internal = Promise.resolve(initial).then();
  }

  bind<L extends string, V>(key: L, f: (ns: NS) => Promise<Either<Failure<C, X>, V>>): EitherComp<C, X, K | L, Insert<NS, L, V>> {
    return new EitherComp<C, X, K | L, Insert<NS, L, V>>(
      this.internal.then((e) => {
        return e.chainAsync(async (ns) => {
          return (await f(ns)).map(v => {
            return { ...ns, [key]: v } as Insert<NS, L, V>
          })
        })
      })
    )
  }

  bind2<K1 extends string, V1, K2 extends string, V2>(key1: K1, key2: K2, f: (ns: NS) => Promise<Either<Failure<C, X>, [V1, V2]>>): EitherComp<C, X, K | K1 | K2, Insert<Insert<NS, K1, V1>, K2, V2>> {
    return new EitherComp<C, X, K | K1 | K2, Insert<Insert<NS, K1, V1>, K2, V2>>(
      this.internal.then((e) => {
        return e.chainAsync(async (ns) => {
          return (await f(ns)).map(([v1, v2]) => {
            return { ...ns, [key1]: v1, [key2]: v2 } as Insert<Insert<NS, K1, V1>, K2, V2>
          })
        })
      })
    )
  }

  bind3<K1 extends string, V1, K2 extends string, V2, K3 extends string, V3>(key1: K1, key2: K2, key3: K3, f: (ns: NS) => Promise<Either<Failure<C, X>, [V1, V2, V3]>>): EitherComp<C, X, K | K1 | K2 | K3, Insert<Insert<Insert<NS, K1, V1>, K2, V2>, K3, V3>> {
    return new EitherComp<C, X, K | K1 | K2, Insert<Insert<Insert<NS, K1, V1>, K2, V2>, K3, V3>>(
      this.internal.then((e) => {
        return e.chainAsync(async (ns) => {
          return (await f(ns)).map(([v1, v2, v3]) => {
            return { ...ns, [key1]: v1, [key2]: v2, [key3]: v3 } as Insert<Insert<Insert<NS, K1, V1>, K2, V2>, K3, V3>
          })
        })
      })
    )
  }

  bindFlat<L extends string, V>(key: L, f: (ns: NS) => Either<Failure<C, X>, V>): EitherComp<C, X, K | L, Insert<NS, L, V>> {
    return new EitherComp<C, X, K | L, Insert<NS, L, V>>(
      this.internal.then((e) => {
        return e.chain(ns => {
          return f(ns).map(v => {
            return { ...ns, [key]: v } as Insert<NS, L, V>
          })
        })
      })
    )
  }

  async yield<B>(f: (ns: NS) => B): Promise<Either<Failure<C, X>, B>> {
    return this.internal.then(e => e.map(f))
  }
}

export function namespace<C extends string, X>() {
  return function<K extends keyof NS & string, NS extends { [P in K]: NS[P] }>(ns: NS) {
    return new EitherComp<C, X, K, NS>(right(ns))
  }
}

export function fromEither<C extends string, X, K extends string, NS extends { [P in K]: NS[P] }>(e: Either<Failure<C, X>, NS>): EitherComp<C, X, K, NS> {
  return e
    .map(ns => namespace<C, X>()(ns) as EitherComp<C, X, K, NS>)
    .orElse(exc => new EitherComp<C, X, K, NS>(left(exc)))
}
