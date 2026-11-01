// The Daily Crumb: one front page for every level, in order. Odd levels nibble a landmark, even levels finish it.
export const NEWS = [
    "Bench Has Small Bite Taken Out", "Bench Now Two Benches, Council Pleased",
    "Duck Pond Reported Slightly Lower", "Pond Drunk. Ducks Say Nothing",
    "Slide Tastes \"Of Bolts\", Says Witness", "Slide Tied In Knot. Children Delighted",
    "Tree Missing One Crunchy Corner", "Tree Reduced To Stick, Stick Reduced To Toothpick",
    "Ice Cream Cart Loses Chunk", "Ice Cream Cart Licked Clean And Abandoned",
    "Mayor's Statue Missing Hat", "Statue Head Replaced With Lollipop. Polls Up 4%",

    "Lamp Post Nibbled, Town Dims Slightly", "Lamp Post Now A Pretzel",
    "Post Box Bitten. Mail Delayed", "All Mail Eaten. Bills Cancelled, Town Rejoices",
    "Car Has New Sunroof", "Car Now Comes In Two Convenient Halves",
    "Bakery Roof Sampled", "Bakery Eaten By Its Biggest Fan",
    "Hydrant Tasted, Declared \"Metal\"", "Hydrant Bursts. Town Awash In Strawberry Soda",
    "Bus Stop Dented", "Bus Stop Sat On. Bus Still Late",

    "Fountain Gets Bite Mark, Wishes Refunded", "Fountain Drained In One Slurp",
    "Clock Tower Corner Missing, Time Unaffected", "Clock Tower Leans. It Is Now Always Lunchtime",
    "Band Stops Playing, Bandstand Bitten", "Monster Wears Bandstand Roof As Party Hat",
    "Market Stall Sampled Before Purchase", "Market Stall Flattened. All Fruit Now Jam",
    "Flag Has Bite, Still Waving", "Flagpole Bent Into Polite Bow",
    "Town Hall Takes Hit, Meeting Continues", "Town Hall Eaten During Debate On Monsters",

    "Lighthouse Licked", "Lighthouse Licked Down To Nub",
    "Ferry Service Disrupted By Teeth", "Ferry Now Two Ferries. Service Doubled",
    "Crane Chewed. Crane Unimpressed", "Crane Bent Into Giant Spoon, Used Immediately",
    "Fish Shack Gets Unwanted Skylight", "Fish Shack Collapses, Fish Free At Last",
    "Buoy Nibbled. Boats Confused", "Buoy Top Gone, Sailors Advised To Guess",
    "Shipping Containers Tasted, All Rejected", "Containers Scattered Like Dropped Sweets",

    "Tower Loses Corner Office", "Tower Now Mostly Open Plan",
    "Bank Bitten. Interest Rates Rise", "Bank Vault Spills. Coins Mistaken For Chocolate",
    "Radio Mast Snacked On. Reception Poor", "Mast Used As Toothpick, Then Discarded",
    "Billboard Chewed Mid-Slogan", "Billboard Now Advertises Monster",
    "Stadium Bitten During Halftime", "Stadium Eaten. Match Abandoned At 0-0",
    "Skyscraper Now A Slightly Shorter Scraper", "Skyscraper Snapped Like Wafer. Nothing Left To Scrape",

    "Monster Bites Cloud. Cloud Tastes Of Cloud", "Rain Cancelled After Cloud Consumed",
    "Blimp Punctured By Single Tooth", "Blimp Flies Away Making Rude Noise",
    "Flight Delayed By Bite", "All Flights Cancelled. So Is The Sky",
    "Hot Air Balloon Popped", "Balloon Eaten, Passenger Fine, Says He's Fine",
    "Satellite Nibbled. TV Goes Fuzzy", "Monster Now Has Excellent Reception",
    "Moon Bitten. Experts Nervous", "Moon Now Crescent Permanently. Nobody Left To Complain",
];
export const SIZES = ["cupcake", "bread roll", "loaf of bread", "fat pigeon", "small corgi", "large corgi", "beanbag", "armchair", "sofa", "piano", "golf cart", "cow",
    "two cows", "small car", "large car", "van", "minibus", "ice cream truck", "shipping container", "garden shed", "bungalow", "bakery", "pub", "bus depot",
    "town hall", "church", "lighthouse", "cargo ship", "office block", "bank", "stadium", "hill", "bigger hill", "regrettable decision", "weather system", "small moon"];
export const sizeOf = (n) => SIZES[Math.min(SIZES.length - 1, Math.floor(n / 2))];
