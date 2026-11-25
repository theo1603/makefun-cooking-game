// Sizzle & Serve — ingredients and recipes. One job: what a dish is made of,
// what it pays, and which kitchen step each ingredient needs before plating.
export const INGREDIENTS = {
  bun: { name: 'Bun', needs: 'none', color: '#e8b25e', price: 2 },
  patty: { name: 'Patty', needs: 'grill', color: '#7a4a2b', price: 6 },
  lettuce: { name: 'Lettuce', needs: 'chop', color: '#6fbf4a', price: 2 },
  tomato: { name: 'Tomato', needs: 'chop', color: '#e14b3a', price: 3 },
  cheese: { name: 'Cheese', needs: 'none', color: '#f7c948', price: 3 },
  sauce: { name: 'Sauce', needs: 'none', color: '#e8823a', price: 2 },
};

// The pantry order, left to right, top to bottom on the bins shelf.
export const PANTRY_ORDER = ['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'sauce'];

// A recipe is the exact set of prepared ingredients a ticket asks for.
// Prepared means: patty grilled, lettuce/tomato chopped, the rest as-is.
export const RECIPES = [
  { id: 'classic', name: 'Classic Stack', items: ['bun', 'patty', 'lettuce'], price: 14, weight: 30 },
  { id: 'cheesy', name: 'Cheesy Melt', items: ['bun', 'patty', 'cheese'], price: 16, weight: 24 },
  { id: 'garden', name: 'Garden Fresh', items: ['bun', 'lettuce', 'tomato', 'cheese'], price: 15, weight: 18 },
  { id: 'deluxe', name: 'Deluxe Rush', items: ['bun', 'patty', 'lettuce', 'tomato', 'sauce'], price: 22, weight: 16 },
  { id: 'double', name: 'Double Trouble', items: ['bun', 'patty', 'patty', 'cheese', 'sauce'], price: 26, weight: 12 },
  { id: 'smoky', name: 'Smoky Stack', items: ['bun', 'patty', 'cheese', 'sauce'], price: 19, weight: 14 },
];

/** Find a recipe by id, or undefined. */
export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

/** Pick a recipe, weighted, using the supplied rng. */
export function pickRecipe(rng) {
  const total = RECIPES.reduce((sum, r) => sum + r.weight, 0);
  let roll = rng() * total;
  for (const recipe of RECIPES) {
    roll -= recipe.weight;
    if (roll <= 0) return recipe;
  }
  return RECIPES[0];
}

/** True when the plate's ingredient multiset equals the recipe's. */
export function plateMatches(plate, recipe) {
  const count = (list) => {
    const map = {};
    for (const item of list) map[item] = (map[item] || 0) + 1;
    return map;
  };
  const a = count(plate);
  const b = count(recipe.items);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if ((a[key] || 0) !== (b[key] || 0)) return false;
  return true;
}

/** How many of the recipe's items the plate already holds (for hints). */
export function plateProgress(plate, recipe) {
  const remaining = [...recipe.items];
  let hit = 0;
  for (const item of plate) {
    const i = remaining.indexOf(item);
    if (i >= 0) {
      remaining.splice(i, 1);
      hit += 1;
    }
  }
  return { hit, total: recipe.items.length };
}
