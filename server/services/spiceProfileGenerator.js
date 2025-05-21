class SpiceProfileGenerator {
  constructor() {
    this.baseSpicePantry = {
      asian: {
        essential: [
          { name: "Soy Sauce", usage: "umami base" },
          { name: "Sesame Oil", usage: "finishing oil" },
          { name: "Rice Vinegar", usage: "acid balance" },
          { name: "Ginger", usage: "aromatic" },
          { name: "Garlic", usage: "aromatic" },
          { name: "Five Spice Powder", usage: "spice blend" },
          { name: "White Pepper", usage: "heat" }
        ],
        advanced: [
          { name: "Miso Paste", usage: "umami boost" },
          { name: "Togarashi", usage: "finishing spice" },
          { name: "Gochugaru", usage: "Korean chili flakes" },
          { name: "Dashi", usage: "stock base" }
        ]
      },
      mediterranean: {
        essential: [
          { name: "Extra Virgin Olive Oil", usage: "base oil" },
          { name: "Lemon", usage: "acid balance" },
          { name: "Garlic", usage: "aromatic" },
          { name: "Oregano", usage: "herb" },
          { name: "Red Pepper Flakes", usage: "heat" }
        ],
        advanced: [
          { name: "Za'atar", usage: "finishing blend" },
          { name: "Sumac", usage: "citrus notes" },
          { name: "Preserved Lemon", usage: "umami citrus" },
          { name: "Harissa", usage: "chili paste" }
        ]
      },
      middleEastern: {
        essential: [
          { name: "Cumin", usage: "base spice" },
          { name: "Coriander", usage: "aromatic spice" },
          { name: "Turmeric", usage: "color/flavor" },
          { name: "Cinnamon", usage: "warm spice" }
        ],
        advanced: [
          { name: "Ras el Hanout", usage: "spice blend" },
          { name: "Baharat", usage: "spice blend" },
          { name: "Dukkah", usage: "nut/spice blend" },
          { name: "Urfa Biber", usage: "dried chili" }
        ]
      }
    };

    this.sauceComponents = {
      bases: ["Soy Sauce", "Fish Sauce", "Olive Oil", "Vinegar", "Citrus Juice"],
      aromatics: ["Garlic", "Ginger", "Shallots", "Green Onions"],
      herbs: ["Cilantro", "Basil", "Parsley", "Mint", "Chives"],
      heat: ["Chili Flakes", "Black Pepper", "White Pepper", "Chili Oil"],
      umami: ["Miso", "Fish Sauce", "Dried Mushroom", "Tomato Paste"],
      texture: ["Sesame Seeds", "Crushed Nuts", "Fried Shallots", "Breadcrumbs"]
    };
  }

  generateSpiceProfile(cuisine, complexity = "advanced") {
    const profile = {
      base_spices: [],
      aromatics: [],
      marinades_sauces: [],
      finishing_seasonings: [],
      garnishes: []
    };

    // Get cuisine-specific spices
    const spices = this.baseSpicePantry[cuisine];
    if (spices) {
      profile.base_spices = [...spices.essential];
      if (complexity === "advanced") {
        profile.base_spices = [...profile.base_spices, ...spices.advanced];
      }
    }

    // Add sauce components
    profile.marinades_sauces.push(this.generateSignatureSauce(cuisine));

    // Add aromatics
    profile.aromatics = this.sauceComponents.aromatics
      .slice(0, 3)
      .map(item => ({ name: item, usage: "aromatic base" }));

    // Add finishing seasonings
    profile.finishing_seasonings = [
      { name: "Maldon Salt", usage: "finishing salt" },
      { name: "Fresh Herbs", usage: "brightness" },
      { name: "Citrus Zest", usage: "aromatic finish" }
    ];

    // Add garnishes
    profile.garnishes = [
      { name: "Micro Herbs", usage: "visual/flavor accent" },
      { name: "Edible Flowers", usage: "visual accent" },
      { name: "Citrus Segments", usage: "acid/visual accent" }
    ];

    return profile;
  }

  generateSignatureSauce(cuisine) {
    const sauces = {
      asian: {
        name: "Umami-Rich Soy-Ginger Sauce",
        components: [
          { ingredient: "Soy Sauce", amount: "1/4 cup", timing: "base" },
          { ingredient: "Mirin", amount: "2 tbsp", timing: "base" },
          { ingredient: "Ginger", amount: "2 tbsp minced", timing: "aromatic" },
          { ingredient: "Garlic", amount: "3 cloves minced", timing: "aromatic" },
          { ingredient: "Sesame Oil", amount: "1 tbsp", timing: "finish" }
        ]
      },
      mediterranean: {
        name: "Herb-Citrus Sauce Vierge",
        components: [
          { ingredient: "Olive Oil", amount: "1/3 cup", timing: "base" },
          { ingredient: "Lemon Juice", amount: "2 tbsp", timing: "acid" },
          { ingredient: "Fresh Herbs", amount: "1/4 cup mixed", timing: "finish" },
          { ingredient: "Shallot", amount: "1 minced", timing: "aromatic" },
          { ingredient: "Capers", amount: "1 tbsp", timing: "umami" }
        ]
      }
    };

    return sauces[cuisine] || sauces.asian; // Default to Asian if cuisine not found
  }
}

module.exports = SpiceProfileGenerator; 