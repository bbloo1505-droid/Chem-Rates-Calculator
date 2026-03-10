export const weeds = {
  bidens: {
    name: "Bidens pilosa",
    treatments: {
      default: {
        condition: "Not seeding",
        chemical: "Glyphosate",
        rate: "1%",
        notes: "Fast knockdown. Glyph becomes inactive in soil."
      },
      seeding: {
        condition: "Seed heads present",
        chemical: "Metsulfuron",
        rate: "0.5g / 10L",
        notes: "Kills seeds and prevents germination."
      }
    }
  }
};
