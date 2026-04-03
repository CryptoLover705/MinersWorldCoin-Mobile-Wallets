#!/bin/bash

set -e

echo "🔧 Patching Boost + Folly for Xcode 15..."

# ---- Boost: ensure BOOST_CONSTEXPR is defined ----
BOOST_FILE="Pods/boost/boost/config/compiler/clang.hpp"

if [ -f "$BOOST_FILE" ]; then
  if ! grep -q "BOOST_CONSTEXPR constexpr" "$BOOST_FILE"; then
    echo "Patching BOOST_CONSTEXPR in $BOOST_FILE"
    sed -i '' '1s;^;#ifndef BOOST_CONSTEXPR\n#define BOOST_CONSTEXPR constexpr\n#endif\n;' "$BOOST_FILE"
  else
    echo "BOOST_CONSTEXPR already patched"
  fi
else
  echo "⚠️ Boost file not found: $BOOST_FILE"
fi

# ---- Folly: add missing boost/operators.hpp include ----
FOLLY_FILE="Pods/Headers/Public/RCT-Folly/folly/dynamic.h"

if [ -f "$FOLLY_FILE" ]; then
  if ! grep -q "boost/operators.hpp" "$FOLLY_FILE"; then
    echo "Patching Folly dynamic.h to include boost/operators.hpp"
    sed -i '' '1s;^;#include <boost/operators.hpp>\n;' "$FOLLY_FILE"
  else
    echo "Folly dynamic.h already patched"
  fi
else
  echo "⚠️ Folly file not found: $FOLLY_FILE"
fi

echo "✅ Boost + Folly patch complete"