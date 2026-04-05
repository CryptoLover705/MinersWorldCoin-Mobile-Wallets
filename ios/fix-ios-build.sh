#!/bin/bash

set -e

echo "🔧 Patching Boost + Folly for Xcode 15..."

# --------------------------------------------------
# 🔍 Locate Boost root
# --------------------------------------------------
echo "🔍 Locating Boost installation..."

BOOST_ROOT=$(find Pods -type d -path "*/boost" | head -n 1)

if [ -z "$BOOST_ROOT" ]; then
  echo "❌ Boost root not found in Pods"
  exit 1
fi

echo "✅ Boost root found at: $BOOST_ROOT"

# --------------------------------------------------
# 🔧 Fix BOOST_CONSTEXPR
# --------------------------------------------------
BOOST_FILE=$(find "$BOOST_ROOT" -path "*/config/compiler/clang.hpp" | head -n 1)

if [ -f "$BOOST_FILE" ]; then
  if ! grep -q "BOOST_CONSTEXPR constexpr" "$BOOST_FILE"; then
    echo "🔧 Patching BOOST_CONSTEXPR in $BOOST_FILE"
    sed -i '' '1s;^;#ifndef BOOST_CONSTEXPR\n#define BOOST_CONSTEXPR constexpr\n#endif\n;' "$BOOST_FILE"
  else
    echo "✅ BOOST_CONSTEXPR already patched"
  fi
else
  echo "⚠️ clang.hpp not found inside Boost (skipping)"
fi

# --------------------------------------------------
# 🔍 Ensure operators.hpp exists
# --------------------------------------------------
OPERATORS_FILE=$(find "$BOOST_ROOT" -path "*/operators.hpp" | head -n 1)

if [ -f "$OPERATORS_FILE" ]; then
  echo "✅ Found boost/operators.hpp at: $OPERATORS_FILE"
else
  echo "❌ boost/operators.hpp NOT FOUND — Boost install is broken"
  exit 1
fi

# --------------------------------------------------
# 🔧 Patch Folly dynamic.h
# --------------------------------------------------
FOLLY_FILE=$(find Pods -path "*/RCT-Folly/folly/dynamic.h" | head -n 1)

if [ -f "$FOLLY_FILE" ]; then
  if ! grep -q "boost/operators.hpp" "$FOLLY_FILE"; then
    echo "🔧 Adding boost/operators.hpp include to Folly dynamic.h"
    sed -i '' '1s;^;#include <boost/operators.hpp>\n;' "$FOLLY_FILE"
  else
    echo "✅ Folly dynamic.h already patched"
  fi
else
  echo "⚠️ Folly dynamic.h not found"
fi

# --------------------------------------------------
# 🔥 Fallback: remove boost dependency if include still breaks
# --------------------------------------------------
if [ -f "$FOLLY_FILE" ]; then
  if grep -q "boost::operators" "$FOLLY_FILE"; then
    echo "🔥 Applying fallback: removing boost::operators dependency"

    sed -i '' 's/private boost::operators<dynamic>//g' "$FOLLY_FILE"
  fi
fi

echo "✅ Boost + Folly patch complete"