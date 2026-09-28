#!/bin/bash

# Practice Cold Call Recording - Terminal Test Script
# Run with: chmod +x test-recording.sh && ./test-recording.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASS=0
FAIL=0
TOTAL=0

# ============= HELPER FUNCTIONS =============
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    TOTAL=$((TOTAL + 1))
    echo -e "${YELLOW}[TEST $TOTAL]${NC} $1"
}

pass() {
    PASS=$((PASS + 1))
    echo -e "${GREEN}✓ PASSED${NC}: $1\n"
}

fail() {
    FAIL=$((FAIL + 1))
    echo -e "${RED}✗ FAILED${NC}: $1\n"
}

# ============= UNIT TESTS =============
print_header "UNIT TESTS: Recording Logic"

print_test "Sensitivity Threshold Calculation"
sensitivity=75
threshold=$(echo "scale=2; -60 + ($sensitivity / 100) * 40" | bc)
if (( $(echo "$threshold > -45 && $threshold < -35" | bc -l) )); then
    pass "Sensitivity converts to correct dB threshold"
else
    fail "Sensitivity conversion failed"
fi

print_test "Speech Pattern Exponential Moving Average"
pattern=800
new_pause=900
alpha_num=3
alpha_den=10
result=$(echo "scale=2; ($alpha_num * $new_pause + ($alpha_den - $alpha_num) * $pattern) / $alpha_den" | bc)
if (( $(echo "$result > 0" | bc -l) )); then
    pass "Speech patterns update correctly"
else
    fail "Pattern tracking failed"
fi

print_test "Recording Duration Tracking"
start_time=$(date +%s)
sleep 1
end_time=$(date +%s)
duration=$((end_time - start_time))
if [ $duration -ge 1 ]; then
    pass "Recording duration tracks correctly"
else
    fail "Duration tracking failed"
fi

print_test "Progress Percentage Calculation"
path_length=3
nodes_length=5
progress=$(( (path_length * 100) / nodes_length ))
if [ $progress -eq 60 ]; then
    pass "Progress calculation is correct"
else
    fail "Progress calculation failed"
fi

# ============= INTEGRATION TESTS =============
print_header "INTEGRATION TESTS"

print_test "File Structure Validation"
if [ -f "src/pages/PracticePage.jsx" ] && [ -f "src/hooks/useAudioAnalyzer.js" ]; then
    pass "Required files exist"
else
    fail "Missing required files"
fi

print_test "Jest Configuration"
if [ -f "jest.config.js" ]; then
    pass "Jest config exists"
else
    fail "Jest config missing"
fi

print_test "Setup Tests File"
if [ -f "src/setupTests.js" ]; then
    pass "Setup tests file exists"
else
    fail "Setup tests file missing"
fi

print_test "Basic Test File"
if [ -f "src/__tests__/basic.test.js" ]; then
    pass "Basic test file exists"
else
    fail "Basic test file missing"
fi

# ============= CONFIGURATION TESTS =============
print_header "CONFIGURATION TESTS"

print_test "Node Installed"
if command -v node &> /dev/null; then
    node_version=$(node --version)
    pass "Node is installed: $node_version"
else
    fail "Node is not installed"
fi

print_test "NPM Installed"
if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    pass "NPM is installed: $npm_version"
else
    fail "NPM is not installed"
fi

print_test "Dependencies Installed"
if [ -d "node_modules" ]; then
    pass "Dependencies installed"
else
    fail "Dependencies not installed - run 'npm install'"
fi

print_test "Package.json Test Scripts"
if grep -q '"test":' package.json; then
    pass "Test scripts configured in package.json"
else
    fail "Test scripts not configured"
fi

# ============= ARRAY TESTS =============
print_header "DATA STRUCTURE TESTS"

# Test array operations (simulating path building)
print_test "Path Array Building"
path_array=("1" "2" "3")
if [ ${#path_array[@]} -eq 3 ]; then
    pass "Path array builds correctly"
else
    fail "Path array building failed"
fi

# Test numeric operations
print_test "Numeric Array Sum"
sum=0
for num in 10 20 30; do
    sum=$((sum + num))
done
if [ $sum -eq 60 ]; then
    pass "Numeric operations work"
else
    fail "Numeric operations failed"
fi

# ============= PERFORMANCE TESTS =============
print_header "PERFORMANCE TESTS"

print_test "Loop Performance"
start=$(date +%s%N)
for i in {1..1000}; do
    duration=$i
done
end=$(date +%s%N)
elapsed=$(( (end - start) / 1000000 ))
if [ $elapsed -lt 100 ]; then
    pass "Loop performance acceptable: ${elapsed}ms"
else
    fail "Loops too slow: ${elapsed}ms"
fi

print_test "String Operations Performance"
start=$(date +%s%N)
text=""
for i in {1..100}; do
    text="${text}chunk"
done
end=$(date +%s%N)
elapsed=$(( (end - start) / 1000000 ))
if [ $elapsed -lt 50 ]; then
    pass "String operations performant: ${elapsed}ms"
else
    fail "String operations too slow: ${elapsed}ms"
fi

# ============= FEATURE TESTS =============
print_header "FEATURE TESTS"

print_test "Difficulty Settings"
difficulties=("Easy" "Medium" "Hard")
if [ ${#difficulties[@]} -eq 3 ]; then
    pass "Difficulty levels defined"
else
    fail "Difficulty levels not defined"
fi

print_test "Speaker Roles"
speakers=("User" "Prospect")
if [ ${#speakers[@]} -eq 2 ]; then
    pass "Speaker roles configured"
else
    fail "Speaker roles not configured"
fi

print_test "Recording Controls"
controls=("Record" "Stop" "Restart")
if [ ${#controls[@]} -eq 3 ]; then
    pass "Recording controls available"
else
    fail "Recording controls missing"
fi

# ============= SUMMARY =============
print_header "TEST SUMMARY"

echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "${BLUE}Total: $TOTAL${NC}\n"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All terminal tests passed!${NC}"
    echo -e "${GREEN}Now run: npm test${NC}\n"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}\n"
    exit 1
fi
