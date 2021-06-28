import {Either, left, right} from "./either";

export type Option<A> = Either<void, A>;

export function some<A>(a: A): Option<A> {
  return right(a)
}

export function none(): Option<never> {
  return left(undefined)
}

export function fromNullable<A>(a: A | undefined | null): Option<A> {
  return a === undefined || a === null ? none() : some(a)
}
