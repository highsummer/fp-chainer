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
  constructor(private internal: EitherInternal<E, A>) {}

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

  eval(): EitherInternal<E, A> {
    return this.internal
  }
}

