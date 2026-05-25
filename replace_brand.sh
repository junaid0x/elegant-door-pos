files=(
"client/src/pages/Products.jsx"
"client/src/pages/Categories.jsx"
"client/src/pages/Invoice.jsx"
"client/src/pages/Orders.jsx"
"client/src/pages/CreateOrder.jsx"
"client/src/pages/EditOrder.jsx"
"client/src/pages/Login.jsx"
"client/src/components/CategoryModal.jsx"
"client/src/components/ProductModal.jsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    sed -i '' 's/bg-blue-600/bg-brand-600/g' "$file"
    sed -i '' 's/hover:bg-blue-500/hover:bg-brand-700/g' "$file"
    sed -i '' 's/bg-blue-400/bg-brand-400/g' "$file"
    sed -i '' 's/text-blue-600/text-brand-600/g' "$file"
    sed -i '' 's/hover:text-blue-700/hover:text-brand-700/g' "$file"
    sed -i '' 's/ring-blue-/ring-brand-/g' "$file"
    sed -i '' 's/border-blue-/border-brand-/g' "$file"
    sed -i '' 's/shadow-blue-/shadow-brand-/g' "$file"
  fi
done
