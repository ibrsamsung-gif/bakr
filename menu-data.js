(function (root, factory) {
  const data = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = data;
  if (root) root.MENU_DATA = data;
})(typeof window !== "undefined" ? window : globalThis, function () {
  return {
    restaurant: {
      name: "شاورما بكر",
      location: "نعلين – رام الله"
    },
    currency: { symbol: "₪", name: "شيقل" },
    slideDurationMs: 8000,
    palette: {
      charcoal: "#0A0A0A",
      white: "#F5F5F5",
      orange: "#FF9D00",
      amber: "#FFB900"
    },
    sections: [
      {
        id: "chicken",
        name: "شاورما دجاج",
        availability: "",
        items: [
          { id: "chicken-wrap", name: "لفة", price: "20", image: "assets/images/chicken-wrap.jpg", photoMatchRequired: true },
          { id: "chicken-kmaj", name: "كماج يمني", price: "14", image: "assets/images/chicken-kmaj.jpg", photoMatchRequired: true },
          { id: "chicken-baguette", name: "باجيت", price: "20", image: "assets/images/chicken-baguette.jpg", photoMatchRequired: true },
          { id: "bashka", name: "باشكا", price: "22", image: "assets/images/bashka.jpg", photoMatchRequired: true },
          { id: "bashka-turkey", name: "باشكا حبش", price: "25", image: "assets/images/turkey-baguette.jpg", photoMatchRequired: true },
          { id: "arabic-shawarma", name: "شاورما عربيّة", price: "22", image: "assets/images/arabic-shawarma.jpg", photoMatchRequired: true },
          { id: "cheese-balls", name: "كرات الشاورما مع جبنة", price: "15", image: "assets/images/cheese-balls.jpg", photoMatchRequired: true },
          { id: "shawarma-fries-chicken", name: "شاورما فراريز دجاج", price: "27", image: "assets/images/shawarma-fries.jpg", photoMatchRequired: true },
          { id: "shawarma-fries-cheese", name: "شاورما فراريز جبنة", price: "30", image: "assets/images/shawarma-fries-cheese.jpg", photoMatchRequired: true }
        ]
      },
      {
        id: "turkey",
        name: "شاورما حبش",
        availability: "",
        items: [
          { id: "turkey-wrap", name: "لفة", price: "23", image: "assets/images/turkey-wrap.jpg", photoMatchRequired: true },
          { id: "turkey-kmaj", name: "كماج يمني", price: "17", image: "assets/images/turkey-kmaj.jpg", photoMatchRequired: true },
          { id: "turkey-baguette", name: "باجيت", price: "23", image: "assets/images/turkey-baguette.jpg", photoMatchRequired: true }
        ]
      },
      {
        id: "lamb",
        name: "شاورما خروف",
        availability: "كل سبت",
        items: [
          { id: "lamb-kmaj", name: "كماج يمني", price: "25", image: "assets/images/lamb-kmaj.jpg", photoMatchRequired: true },
          { id: "lamb-wrap", name: "لفة", price: "30", image: "assets/images/lamb-wrap.jpg", photoMatchRequired: true },
          { id: "lamb-baguette", name: "باجيت", price: "30", image: "assets/images/lamb-baguette.jpg", photoMatchRequired: true }
        ]
      }
    ]
  };
});
