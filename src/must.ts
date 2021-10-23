import {Either} from "./either";

export class Must<E, A> {
  constructor(protected a: A, protected e: E[]) {}

  chain<F, B>(f: (a: A) => Either<F, B> | Must<E | F, A | B>): Must<E | F, A | B> {
    const result = f(this.a);
    if (result instanceof Either) {
      return result.getOrElse(
        b => new Must<E | F, A | B>(b, this.e),
        e => new Must<E | F, A | B>(this.a, [...this.e, e])
      )
    } else {
      return result.mapLeft(fs => [...this.e, ...fs])
    }
  }

  chainOr<F, B>(f: (a: A) => Either<F, B> | Must<E | F, B>, or: B): Must<E | F, B> {
    const result = f(this.a);
    if (result instanceof Either) {
      return result.getOrElse(
        b => new Must<E | F, B>(b, this.e),
        e => new Must<E | F, B>(or, [...this.e, e])
      )
    } else {
      return result.mapLeft(fs => [...this.e, ...fs])
    }
  }

  map<B>(f: (a: A) => B): Must<E, B> {
    return new Must(f(this.a), this.e)
  }

  chainLeft<F, B>(f: (es: E[]) => Either<F, B> | Must<E | F, A | B>): Must<E | F, A | B> {
    const result = f(this.e);
    if (result instanceof Either) {
      return result.getOrElse(
        b => new Must<E | F, A | B>(b, []),
        e => new Must<E | F, A | B>(this.a, [...this.e, e])
      )
    } else {
      return result.mapLeft(fs => [...this.e, ...fs])
    }
  }

  chainLeftOr<F, B>(f: (es: E[]) => Either<F, B> | Must<E | F, B>, or: B): Must<E | F, B> {
    const result = f(this.e);
    if (result instanceof Either) {
      return result.getOrElse(
        b => new Must<E | F, B>(b, []),
        e => new Must<E | F, B>(or, [...this.e, e])
      )
    } else {
      return result.mapLeft(fs => [...this.e, ...fs])
    }
  }

  mapLeft<F>(f: (es: E[]) => F[]): Must<F, A> {
    return new Must(this.a, f(this.e))
  }

  get(): A {
    return this.a
  }

  errors(): E[] {
    return this.e
  }
}