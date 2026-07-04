/* ═══════════════════════════════════════════════════════════
   PROPERTY CATALOGUE — DATA
   Single source of truth for every showcase property.
   All properties are Cape Town based.

   To add a property:
     1. Drop its photos into /images
     2. Append one object to the array below
     3. Done — card, gallery and walkthrough render themselves.

   The card tag shows the suburb (first part of `location`).

   `type` drives the catalogue filter tabs: house | villa |
   apartment | estate. Filter buttons render automatically
   from whichever types exist in this file.

   `video` accepts:
     - a local file in /videos (e.g. 'videos/camps-bay.mp4') —
       played inline with the native player (best quality, no
       third-party branding), or
     - a YouTube (watch / youtu.be / embed) or Vimeo URL —
       validated and rewritten to a privacy-enhanced embed.
   Anything else is dropped.

   The demo video below is a stable public placeholder —
   replace it with your own walkthrough URLs.
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* Site-wide media. Set heroVideo to a local file (e.g. 'videos/hero.mp4')
   to layer a muted, looping film over the hero slideshow. The slideshow
   stays as the automatic fallback if the file is missing or can't play. */
window.SITE_MEDIA = {
  heroVideo: 'videos/hero.mp4'
};

window.PROPERTIES = [
  {
    id: 'bantry-bay-penthouse',
    type: 'apartment',
    title: 'Atlantic Seaboard Penthouse',
    location: 'Bantry Bay, Cape Town',
    featured: true,           /* featured card takes the wide grid slot */
    description: 'A double-volume penthouse suspended above the Atlantic. Shot at golden hour to carry the ocean light through the master salon, terrace and kitchen.',
    services: ['HDR Stills', 'Twilight', 'Walkthrough'],
    photos: [
      'images/hero_interior.png',
      'images/prop1_terrace.png',
      'images/portfolio_kitchen.png'
    ],
    video: 'videos/bantry-bay-penthouse.mp4'
  },
  {
    id: 'constantia-manor',
    type: 'estate',
    title: 'Historic Constantia Manor',
    location: 'Constantia Valley, Cape Town',
    description: 'A Cape Dutch original under centuries-old oaks. Facade symmetry, gable detail and aerial context frames of the werf and vineyards.',
    services: ['HDR Stills', 'Drone'],
    photos: [
      'images/prop2_exterior.png',
      'images/prop2_interior.png',
      'images/portfolio_drone.png'
    ],
    video: null
  },
  {
    id: 'camps-bay-infinity-villa',
    type: 'villa',
    title: 'Camps Bay Infinity Villa',
    location: 'Camps Bay, Cape Town',
    description: 'Ultra-modern villa against the Twelve Apostles. The infinity edge, formal lounge and a twilight closer shot thirty minutes after sunset.',
    services: ['HDR Stills', 'Twilight', 'Walkthrough'],
    photos: [
      'images/prop3_pool.png',
      'images/prop3_interior.png',
      'images/prop3_twilight.png'
    ],
    video: 'videos/camps-bay-infinity-villa.mp4'
  },
  {
    id: 'bishopscourt-country-house',
    type: 'house',
    title: 'Bishopscourt Country House',
    location: 'Bishopscourt, Cape Town',
    description: 'Stone-and-slate country home on a manicured erf. Full coverage: facade, formal lounge, garden axis and principal suite.',
    services: ['HDR Stills', 'Virtual Staging'],
    photos: [
      'images/prop4_facade.png',
      'images/prop4_lounge.png',
      'images/prop4_garden.png',
      'images/portfolio_bedroom.png'
    ],
    video: null
  },
  {
    id: 'fresnaye-architectural-mansion',
    type: 'house',
    title: 'Fresnaye Architectural Mansion',
    location: 'Fresnaye, Cape Town',
    description: 'Brutalist concrete softened by uplighting. Shot day and twilight to sell both the architecture and the atmosphere.',
    services: ['HDR Stills', 'Twilight', 'Walkthrough'],
    photos: [
      'images/portfolio_exterior.png',
      'images/portfolio_twilight2.png'
    ],
    video: 'videos/fresnaye-architectural-mansion.mp4'
  },
  {
    id: 'higgovale-glass-estate',
    type: 'estate',
    title: 'Higgovale Glass Estate',
    location: 'Higgovale, Cape Town',
    description: 'A glass pavilion estate on the slopes of Table Mountain that only reveals itself after dark. Twilight-led set with dramatic facade uplighting.',
    services: ['Twilight', 'HDR Stills'],
    photos: [
      'images/portfolio_twilight2.png',
      'images/hero_twilight.png'
    ],
    video: null
  },
  {
    id: 'clifton-cliffside-sanctuary',
    type: 'villa',
    title: 'Clifton Cliffside Sanctuary',
    location: 'Clifton Beach, Cape Town',
    description: 'Terraced decks stepping down the cliff toward Clifton Fourth. Sunset terrace lead frame with interior follow-ups.',
    services: ['HDR Stills', 'Walkthrough'],
    photos: [
      'images/prop1_terrace.png',
      'images/hero_interior.png'
    ],
    video: 'videos/clifton-cliffside-sanctuary.mp4'
  },
  {
    id: 'durbanville-vineyard-pavilion',
    type: 'estate',
    title: 'Durbanville Vineyard Pavilion',
    location: 'Durbanville Valley, Cape Town',
    description: 'Homestead at the centre of working vineyard rows. Drone-led coverage to establish scale and setting.',
    services: ['Drone', 'HDR Stills'],
    photos: [
      'images/portfolio_drone.png',
      'images/prop2_exterior.png'
    ],
    video: null
  },
  {
    id: 'hout-bay-ridge-villa',
    type: 'villa',
    title: 'Hout Bay Ridge Villa',
    location: 'Hout Bay, Cape Town',
    description: 'Double-volume formal lounge with bespoke stone cladding, shot to hold detail from the grand piano to the harbour view.',
    services: ['HDR Stills'],
    photos: [
      'images/prop3_interior.png',
      'images/prop4_lounge.png'
    ],
    video: null
  },
  {
    id: 'noordhoek-parkland-estate',
    type: 'house',
    title: 'Noordhoek Parkland Estate',
    location: 'Noordhoek, Cape Town',
    description: 'Parkland villa above the valley. Pool deck lead with facade support frames at midday and dusk.',
    services: ['HDR Stills', 'Drone', 'Walkthrough'],
    photos: [
      'images/prop3_pool.png',
      'images/prop4_facade.png'
    ],
    video: 'videos/noordhoek-parkland-estate.mp4'
  }
];
