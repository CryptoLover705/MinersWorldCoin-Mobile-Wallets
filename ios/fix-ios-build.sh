#!/bin/bash

echo "🔧 Patching Boost + Folly for Xcode 15..."

# Fix BOOST_CONSTEXPR
BOOST_FILE="Pods/boost/boost/config/compiler/clang.hpp"

if [ -f "$BOOST_FILE" ]; then
  grep -q "BOOST_CONSTEXPR constexpr" "$BOOST_FILE" || \
  sed -i '' '1s;^;#ifndef BOOST_CONSTEXPR\n#define BOOST_CONSTEXPR constexpr\n#endif\n;' "$BOOST_FILE"
fi

# Fix missing boost/operators include in folly
FOLLY_FILE="Pods/Headers/Public/RCT-Folly/folly/dynamic.h"

if [ -f "$FOLLY_FILE" ]; then
  grep -q "boost/operators.hpp" "$FOLLY_FILE" || \
  sed -i '' '1s;^;#include <boost/operators.hpp>\n;' "$FOLLY_FILE"
fi

echo "✅ Patch complete"