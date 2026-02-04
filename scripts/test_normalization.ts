
import { normalizePhone } from '../src/lib/utils/phone'

async function testNormalization() {
    console.log('Testing Phone Normalization...')

    const testCases = [
        { input: '(11) 99999-9999', expected: '11999999999' },
        { input: '11 999999999', expected: '11999999999' },
        { input: '11-99999-9999', expected: '11999999999' },
        { input: '+55 11 99999-9999', expected: '5511999999999' },
        { input: 'phone@123', expected: '123' },
        { input: '', expected: '' }
    ]

    let passed = 0
    testCases.forEach(({ input, expected }, i) => {
        const result = normalizePhone(input)
        if (result === expected) {
            console.log(`✅ Test ${i + 1} passed: "${input}" -> "${result}"`)
            passed++
        } else {
            console.error(`❌ Test ${i + 1} failed: "${input}" -> expected "${expected}", got "${result}"`)
        }
    })

    console.log(`\nResult: ${passed}/${testCases.length} tests passed.`)
}

testNormalization()
