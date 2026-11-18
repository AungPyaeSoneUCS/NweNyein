/** Shared public branding and location details. */
export const SITE_NAME = "နွယ်ငြိမ်းတောင်ပေါ်ကျောင်းတိုက်";

/** Monastery coordinates (from the Google Maps place embed). */
export const MONASTERY_LOCATION = {
  lat: 18.236648077883935,
  lng: 95.34116764266024,
};

/** Shareable Google Maps link. */
export const MAP_SHORT_URL = "https://maps.app.goo.gl/fHGjq1Dm4NvwLGLu8";

/** Google Maps embed used on the home page. */
export const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3429.2259598809837!2d95.34116764266024!3d18.236648077883935!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30c747b5fedd9e75%3A0x87133aaf7bcf4777!2zTndlIE55ZWluIEhpbGwgTW9uYXN0ZXJ5ICjhgJThgL3hgJrhgLrhgIThgLzhgK3hgJnhgLrhgLjhgJDhgLHhgKzhgIThgLrhgJXhgLHhgKvhgLrhgIDhgLvhgLHhgKzhgIThgLrhgLjhgJDhgK3hgK_hgIDhgLop!5e1!3m2!1sen!2smm!4v1794966467933!5m2!1sen!2smm";

/** Directions URL that works on phones and desktops. */
export const MAP_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${MONASTERY_LOCATION.lat},${MONASTERY_LOCATION.lng}`;
