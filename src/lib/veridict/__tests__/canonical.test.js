import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { canonicalJson, hashCanonical } from "../canonical.js"

describe("canonicalJson", () => {
  it("serializes primitives identically to JSON rules", () => {
    assert.equal(canonicalJson(null), "null")
    assert.equal(canonicalJson(true), "true")
    assert.equal(canonicalJson(false), "false")
    assert.equal(canonicalJson(42), "42")
    assert.equal(canonicalJson(3.14159), "3.14159")
    assert.equal(canonicalJson("hello world"), '"hello world"')
    assert.equal(canonicalJson("special characters: \n\t\"\\"), JSON.stringify("special characters: \n\t\"\\"))
  })

  it("handles -0 normalization per RFC 8785", () => {
    assert.equal(canonicalJson(-0), "0")
    assert.equal(canonicalJson(0), "0")
  })

  it("rejects non-finite numbers", () => {
    assert.throws(() => canonicalJson(Infinity), /Cannot canonically serialize non-finite number/)
    assert.throws(() => canonicalJson(-Infinity), /Cannot canonically serialize non-finite number/)
    assert.throws(() => canonicalJson(NaN), /Cannot canonically serialize non-finite number/)
  })

  it("serializes BigInt cleanly", () => {
    assert.equal(canonicalJson(1000000000000000000n), '"1000000000000000000"')
  })

  it("sorts object keys in lexicographical UTF-16 order", () => {
    const objA = { z: 1, a: 2, m: 3 }
    const objB = { a: 2, m: 3, z: 1 }
    const objC = { m: 3, z: 1, a: 2 }

    const expected = '{"a":2,"m":3,"z":1}'

    assert.equal(canonicalJson(objA), expected)
    assert.equal(canonicalJson(objB), expected)
    assert.equal(canonicalJson(objC), expected)
  })

  it("recursively sorts nested objects", () => {
    const nested1 = {
      user: { name: "Agent B", id: 2, address: { zip: "10001", city: "NYC" } },
      action: "settle",
      pactId: 1024,
    }

    const nested2 = {
      pactId: 1024,
      action: "settle",
      user: { address: { city: "NYC", zip: "10001" }, id: 2, name: "Agent B" },
    }

    const canonical1 = canonicalJson(nested1)
    const canonical2 = canonicalJson(nested2)

    assert.equal(canonical1, canonical2)
    assert.equal(
      canonical1,
      '{"action":"settle","pactId":1024,"user":{"address":{"city":"NYC","zip":"10001"},"id":2,"name":"Agent B"}}'
    )
  })

  it("omits undefined properties in objects and turns them to null in arrays", () => {
    const obj = { a: 1, b: undefined, c: 3 }
    assert.equal(canonicalJson(obj), '{"a":1,"c":3}')

    const arr = [1, undefined, 3]
    assert.equal(canonicalJson(arr), "[1,null,3]")
  })

  it("preserves array ordering", () => {
    const arrA = [3, 1, 2]
    const arrB = [1, 2, 3]
    assert.equal(canonicalJson(arrA), "[3,1,2]")
    assert.equal(canonicalJson(arrB), "[1,2,3]")
    assert.notEqual(canonicalJson(arrA), canonicalJson(arrB))
  })
})

describe("hashCanonical", () => {
  it("computes identical keccak256 hash regardless of object key order", () => {
    const obj1 = {
      pactId: "1",
      creator: "0x1111111111111111111111111111111111111111",
      recipient: "0x2222222222222222222222222222222222222222",
      amount: "1.5",
      criteria: [
        { id: 1, type: "TYPE_A_API_COUNT", count: 5 },
        { id: 2, type: "TYPE_C_HASH_MATCH", hash: "0xabcdef" },
      ],
    }

    const obj2 = {
      criteria: [
        { count: 5, type: "TYPE_A_API_COUNT", id: 1 },
        { hash: "0xabcdef", id: 2, type: "TYPE_C_HASH_MATCH" },
      ],
      amount: "1.5",
      recipient: "0x2222222222222222222222222222222222222222",
      creator: "0x1111111111111111111111111111111111111111",
      pactId: "1",
    }

    const hash1 = hashCanonical(obj1)
    const hash2 = hashCanonical(obj2)

    assert.equal(hash1, hash2)
    assert.match(hash1, /^0x[a-f0-9]{64}$/)
  })

  it("produces different hashes for different contents", () => {
    const hash1 = hashCanonical({ amount: "1.0", recipient: "0x123" })
    const hash2 = hashCanonical({ amount: "1.1", recipient: "0x123" })
    assert.notEqual(hash1, hash2)
  })

  it("throws when hashing undefined", () => {
    assert.throws(() => hashCanonical(undefined), /Cannot compute canonical hash for non-serializable value/)
  })
})
