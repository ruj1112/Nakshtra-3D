import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SupportedLanguage = 'hi' | 'mr' | 'en';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}

export interface UpcomingLanguage {
  code: string;
  name: string;
  nativeName: string;
  script: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    region: 'भारत (India)',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    region: 'महाराष्ट्र (Maharashtra)',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🌐',
    region: 'Global / International',
  },
];

export const UPCOMING_INDIAN_LANGUAGES: UpcomingLanguage[] = [
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Odia' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', script: 'Devanagari' },
];

export const translations = {
  hi: {
    // App Header
    appName: 'नक्षत्र दर्पण',
    appSubtitle: 'वैदिक आकाश एवं पंचांग',
    moon: 'चन्द्र',
    pada: 'चरण',
    changeLocation: 'स्थान बदलें',
    arActive: 'एआर सक्रिय',
    nightVisionEnable: 'रात्रि दृष्टि (रेड मोड चालू करें)',
    nightVisionDisable: 'रात्रि दृष्टि बन्द करें',
    displayLayers: 'प्रदर्शित परतें (Layers)',
    nakshatraShapes: 'नक्षत्र आकृतियां',
    starLabels: 'तारे व नक्षत्र नाम',
    planetsNavagrahas: 'ग्रह (नवग्रह)',
    horizonCompass: 'क्षितिज एवं दिक्सूचक',
    eclipticPath: 'क्रांतिवृत्त मार्ग (Ecliptic)',
    mapSettings: 'मानचित्र संरेखण एवं सेटिंग्स',

    // Tabs
    tabSky: 'आकाश',
    tabNakshatras: 'नक्षत्र',
    tabPlanets: 'ग्रह',
    tabTransits: 'गोचर',
    tabHistory: 'इतिहास',

    // Settings Modal
    settingsTitle: 'मानचित्र संरेखण एवं सेटिंग्स',
    settingsSubtitle: 'दिशा संरेखण, संवेदनशीलता एवं भाषा',
    closeSettings: 'सेटिंग्स बन्द करें',

    // Language Section in Settings
    languageTitle: 'भाषा चयन (Language & Localization)',
    languageSubtitle: 'एप्लिकेशन की मुख्य भाषा चुनें',
    activeLanguage: 'सक्रिय भाषा',
    upcomingLanguagesTitle: 'आगामी भारतीय भाषाएं (Coming Soon)',
    upcomingLanguagesNote: 'जल्द ही अन्य भारतीय भाषाएं जोड़ी जाएंगी:',

    // Alignment Instructions
    alignmentGuideTitle: 'संरेखण विधि (How to Align):',
    alignmentStep1: '1. अपने फोन को वास्तविक सूर्य, उत्तर, पश्चिम या दक्षिण की ओर सीधा रखें।',
    alignmentStep2: '2. नीचे दिए गए संबंधित बटन पर टैप करें — मानचित्र तुरंत उस दिशा में सटीक संरेखित हो जाएगा।',
    quickAlignTitle: 'त्वरित संरेखण बटन (Quick Align)',
    sensorActiveLabel: 'सेंसर सक्रिय',
    manualModeLabel: 'मैन्युअल मोड',

    // Cardinal buttons
    alignToSun: 'सूर्य की ओर संरेखित करें',
    sunDayVisible: 'दिन में दृश्य',
    sunBelowHorizon: 'क्षितिज से नीचे',
    azimuth: 'अज़ीमुथ (Az)',
    altitude: 'उन्नतांश',
    alignSunBtn: 'संरेखित ☀️',

    north: 'उत्तर (North)',
    northDegree: '0°',
    pointNorth: 'फोन उत्तर की ओर रखें',

    west: 'पश्चिम (West)',
    westDegree: '270°',
    pointWest: 'फोन पश्चिम की ओर रखें',

    south: 'दक्षिण (South)',
    southDegree: '180°',
    pointSouth: 'फोन दक्षिण की ओर रखें',

    east: 'पूर्व (East)',
    eastDegree: '90°',
    pointEast: 'फोन पूर्व की ओर रखें',

    alignToMoon: 'चन्द्रमा से संरेखित करें',
    moonAboveHorizon: 'क्षितिज के ऊपर',
    moonBelowHorizon: 'क्षितिज के नीचे',

    // Sensor Sensitivity
    sensitivityTitle: 'सेंसर पैनिंग संवेदनशीलता (Sensitivity):',
    sensitivityDesc: 'सेंसर ऑटो-पैनिंग प्रतिक्रिया गति एवं कम्पन-अवरोधन',
    smooth: 'मन्द',
    balanced: 'संतुलित',
    fast: 'तीव्र',
    ultra: 'अति-तीव्र',
    smoothDesc: 'Smooth',
    balancedDesc: 'Normal',
    fastDesc: 'Fast',
    ultraDesc: 'Ultra',

    // Manual Offset & AR
    fineOffsetTitle: 'सूक्ष्म दिक्सूचक ऑफसेट (Fine Offset):',
    arDimmerTitle: 'एआर पृष्ठभूमि कंट्रास्ट (AR Dimmer):',
    switchCamera: 'कैमरा बदलें',
    rearCamera: 'रियर',
    frontCamera: 'फ्रंट',
    resetOffset: 'रीसेट 0° (Reset)',
    sensorLocked: 'सेंसर लॉक है ✓',
    relockSensor: 'सेंसर पुनः लॉक करें',

    // Bottom Helper Ribbon
    helperAr: 'कैमरा क्षितिज की ओर रखें (नक्षत्र आवरण देखने के लिए)',
    helperSensor: 'क्वाटर्नियन ट्रैकिंग सक्रिय · फोन आकाश में घुमाएँ',
    helperTouch: 'ड्रैग करके आकाश घुमाएं या एआर / कम्पास बटन दबाएं',

    // Time Controller
    timeLive: 'प्रत्यक्ष (Live)',
    timeSimulated: 'सिमुलेशन',
    timeResetNow: 'वर्तमान समय',
    stepHourBack: '-1 घं',
    stepHourForward: '+1 घं',
    stepDayBack: '-1 दिन',
    stepDayForward: '+1 दिन',

    // Sub-views titles
    nakshatrasDirectoryTitle: '२७ वैदिक नक्षत्र (The 27 Vedic Nakshatras)',
    nakshatrasDirectorySub: 'अश्विनी से रेवती तक 27 चंद्र नक्षत्र। किसी भी नक्षत्र पर टैप करके आकृति, योगतारा, देवता और 4 चरण देखें।',
    planetsTitle: 'नवग्रह पंचांग (Navagrahas Ephemeris)',
    planetsSub: 'सूर्य, चंद्र और सभी नवग्रहों की तात्कालिक वास्तविक स्थिति, राशि, नक्षत्र चरण और क्षितिज निर्देशांक।',
    transitsTitle: 'आकाशीय गोचर सूचनाएं (Transit Notifications)',
    transitsSub: 'चंद्र प्रवेश, नए नक्षत्र में ग्रहों का संक्रमण, ग्रहण और वक्री चाल के लिए अलर्ट कॉन्फ़िगर करें।',
    historyTitle: 'ऐतिहासिक खगोलीय अभिलेखागार (Historical Events)',

    // Toast
    toastAlignedTo: 'की ओर संरेखित',
    toastOffsetReset: 'ऑफसेट रीसेट 0° (Offset Reset)',
    toastOffset: 'दिक्सूचक ऑफसेट',

    // Zoom Target Options
    zoomTargetSectionTitle: 'ज़ूम विकल्प (Zoom Options - 3D या टेक्स्ट)',
    zoomTargetSectionDesc: 'चुनें कि पिंच अथवा ज़ूम करने पर क्या बड़ा/छोटा हो',
    zoomTargetBoth: '3D आकाश + टेक्स्ट (Both)',
    zoomTargetBothShort: '3D + टेक्स्ट',
    zoomTargetBothDesc: 'आकाशीय 3D दृश्य व सभी नाम/लेबल एक साथ ज़ूम होते हैं',
    zoomTarget3D: 'केवल 3D आकाश (3D Sky Only)',
    zoomTarget3DShort: '3D आकाश',
    zoomTarget3DDesc: 'गहरा दूरबीन 3D दृश्य ज़ूम करें, टेक्स्ट का आकार स्थिर व स्पष्ट रहता है',
    zoomTargetText: 'केवल टेक्स्ट व नाम (Text Only)',
    zoomTargetTextShort: 'केवल टेक्स्ट',
    zoomTargetTextDesc: 'आकाश स्थिर रहता है, नक्षत्र व तारों के नामों का फॉन्ट आकार बड़ा/छोटा करें',
    zoomScale3DLabel: '3D आकाशीय ज़ूम (3D Sky Zoom)',
    zoomScaleTextLabel: 'टेक्स्ट फॉन्ट आकार (Text Label Size)',
    zoomModeActive: 'सक्रिय ज़ूम मोड',
    zoomModeHUD: 'ज़ूम मोड',

    // Tooltip Help
    tooltipHelpTitle: 'टूलटिप सहायता (Tooltip Help)',
    tooltipHelpCheckboxLabel: 'स्क्रीन पर टूलटिप व सहायता निर्देश दिखाएं',
    tooltipHelpDesc: 'पिंच-टू-ज़ूम, पैनिंग, बटन के विवरण और आकाशीय मार्गदर्शन टूलटिप्स सक्षम करें',
    gestureGuideTooltip: '💡 दो अंगुलियों से पिंच करके ज़ूम करें · ड्रैग करके आकाश घुमाएं · किसी तारे/नक्षत्र पर टैप करें',
    tooltipHelpActive: 'टूलटिप सक्रिय',
    tooltipHelpDisabled: 'टूलटिप निष्क्रिय',

    // Perspective Views (Sky, AR, Earth Globe)
    perspectiveMode: 'दृष्टिकोण दृश्य (Perspective)',
    perspectiveSky: 'आकाश दृश्य (Sky Dome)',
    perspectiveSkyDesc: 'पृथ्वी की सतह से ऊपर आकाशीय क्षितिज गुंबद देखें',
    perspectiveAR: 'एआर कैमरा (AR Camera)',
    perspectiveARDesc: 'वास्तविक कैमरा क्षितिज पर आकाशीय नक्षत्र ओवरले',
    perspectiveGlobe: 'पृथ्वी प्रक्षेपण (Earth Globe)',
    perspectiveGlobeDesc: 'पृथ्वी गोल पर सभी 3D ग्रह व नक्षत्रों का प्रक्षेपण',
    globeRotateHint: '💡 पृथ्वी को 3D में घुमाने के लिए ड्रैग करें · ज़ूम करने के लिए 2 अंगुलियों से पिंच करें · किसी भी ग्रह/नक्षत्र पर टैप करें',
    resetGlobeView: 'निरीक्षक स्थान पर केंद्रित करें',
    observerLocationBeacon: 'आपका स्थान (Observer Location)',
    subPlanetaryPoint: 'उप-ग्रह बिंदु (Sub-planetary Zenith)',
    observerHorizon: 'निरीक्षक का दृश्य क्षितिज (Observer Horizon)',
    globeZoom3DLabel: '3D पृथ्वी गोल ज़ूम (Globe Zoom)',
    globeTerminator: 'दिन व रात विभाजक (Day/Night Terminator)',
  },

  mr: {
    // App Header
    appName: 'नक्षत्र दर्पण',
    appSubtitle: 'वैदिक आकाश आणि पंचांग',
    moon: 'चंद्र',
    pada: 'चरण',
    changeLocation: 'स्थान बदला',
    arActive: 'एआर सक्रिय',
    nightVisionEnable: 'रात्रीची दृष्टी (रेड मोड सुरू करा)',
    nightVisionDisable: 'रात्रीची दृष्टी बंद करा',
    displayLayers: 'प्रदर्शित थर (Layers)',
    nakshatraShapes: 'नक्षत्र रचना आणि रेषा',
    starLabels: 'तारे आणि नक्षत्र नावे',
    planetsNavagrahas: 'ग्रह (नवग्रह)',
    horizonCompass: 'क्षितिज आणि होकायंत्र',
    eclipticPath: 'क्रांतिवृत्त मार्ग (Ecliptic)',
    mapSettings: 'नकाशा संरेखन आणि सेटिंग्ज',

    // Tabs
    tabSky: 'आकाश',
    tabNakshatras: 'नक्षत्र',
    tabPlanets: 'ग्रह',
    tabTransits: 'गोचर',
    tabHistory: 'इतिहास',

    // Settings Modal
    settingsTitle: 'नकाशा संरेखन आणि सेटिंग्ज',
    settingsSubtitle: 'दिशा संरेखन, संवेदनशीलता आणि भाषा',
    closeSettings: 'सेटिंग्ज बंद करा',

    // Language Section in Settings
    languageTitle: 'भाषा निवड (Language & Localization)',
    languageSubtitle: 'अॅप्लिकेशनची मुख्य भाषा निवडा',
    activeLanguage: 'सक्रिय भाषा',
    upcomingLanguagesTitle: 'आगामी भारतीय भाषा (Coming Soon)',
    upcomingLanguagesNote: 'लवकरच इतर भारतीय भाषा जोडल्या जातील:',

    // Alignment Instructions
    alignmentGuideTitle: 'संरेखन पद्धत (How to Align):',
    alignmentStep1: '१. आपला फोन प्रत्यक्ष सूर्य, उत्तर, पश्चिम किंवा दक्षिणेकडे रोखून धरा.',
    alignmentStep2: '२. खालील संबंधित बटनावर टॅप करा — नकाशा त्वरित त्या दिशेशी अचूक संरेखित होईल.',
    quickAlignTitle: 'त्वरित संरेखन बटणे (Quick Align)',
    sensorActiveLabel: 'सेन्सर सक्रिय',
    manualModeLabel: 'मॅन्युअल मोड',

    // Cardinal buttons
    alignToSun: 'सूर्याकडे संरेखित करा',
    sunDayVisible: 'दिवसा दृश्यमान',
    sunBelowHorizon: 'क्षितिजाखाली',
    azimuth: 'अझीमुथ (Az)',
    altitude: 'उन्नतांश',
    alignSunBtn: 'संरेखित ☀️',

    north: 'उत्तर (North)',
    northDegree: '0°',
    pointNorth: 'फोन उत्तरेकडे धरा',

    west: 'पश्चिम (West)',
    westDegree: '270°',
    pointWest: 'फोन पश्चिमेकडे धरा',

    south: 'दक्षिण (South)',
    southDegree: '180°',
    pointSouth: 'फोन दक्षिणेकडे धरा',

    east: 'पूर्व (East)',
    eastDegree: '90°',
    pointEast: 'फोन पूर्वेकडे धरा',

    alignToMoon: 'चंद्राशी संरेखित करा',
    moonAboveHorizon: 'क्षितिजावर',
    moonBelowHorizon: 'क्षितिजाखाली',

    // Sensor Sensitivity
    sensitivityTitle: 'सेन्सर पॅनिंग संवेदनशीलता (Sensitivity):',
    sensitivityDesc: 'सेन्सर ऑटो-पॅनिंग प्रतिसाद गती आणि कंपन-निवारण',
    smooth: 'मंद',
    balanced: 'संतुलित',
    fast: 'जलद',
    ultra: 'अति-जलद',
    smoothDesc: 'Smooth',
    balancedDesc: 'Normal',
    fastDesc: 'Fast',
    ultraDesc: 'Ultra',

    // Manual Offset & AR
    fineOffsetTitle: 'सूक्ष्म होकायंत्र ऑफसेट (Fine Offset):',
    arDimmerTitle: 'एआर पार्श्वभूमी कॉन्ट्रास्ट (AR Dimmer):',
    switchCamera: 'कॅमेरा बदला',
    rearCamera: 'मागील',
    frontCamera: 'पुढील',
    resetOffset: 'रीसेट 0° (Reset)',
    sensorLocked: 'सेन्सर लॉक आहे ✓',
    relockSensor: 'सेन्सर पुन्हा लॉक करा',

    // Bottom Helper Ribbon
    helperAr: 'कॅमेरा क्षितिजाकडे रोखून धरा (नक्षत्र आवरण पाहण्यासाठी)',
    helperSensor: 'क्वाटर्नियन ट्रॅकिंग सक्रिय · फोन आकाशात फिरवा',
    helperTouch: 'ड्रॅग करून आकाश फिरवा किंवा एआर / होकायंत्र बटण दाबा',

    // Time Controller
    timeLive: 'थेट (Live)',
    timeSimulated: 'सिम्युलेशन',
    timeResetNow: 'सध्याची वेळ',
    stepHourBack: '-1 तास',
    stepHourForward: '+1 तास',
    stepDayBack: '-1 दिवस',
    stepDayForward: '+1 दिवस',

    // Sub-views titles
    nakshatrasDirectoryTitle: '२७ वैदिक नक्षत्र (The 27 Vedic Nakshatras)',
    nakshatrasDirectorySub: 'अश्विनी ते रेवती पर्यंत २७ चंद्र नक्षत्र. आकृती, योगतारा, देवता आणि ४ चरण पाहण्यासाठी कोणत्याही नक्षत्रावर टॅप करा.',
    planetsTitle: 'नवग्रह पंचांग (Navagrahas Ephemeris)',
    planetsSub: 'सूर्य, चंद्र आणि सर्व नवग्रहांची तात्काळ स्थिती, रास, नक्षत्र चरण आणि क्षितिज समन्वय.',
    transitsTitle: 'आकाशीय गोचर सूचना (Transit Notifications)',
    transitsSub: 'चंद्र प्रवेश, नक्षत्रातील ग्रहांचे संक्रमण, ग्रहण आणि वक्री चालीसाठी अलर्ट कॉन्फिगर करा.',
    historyTitle: 'ऐतिहासिक खगोलीय नोंदी (Historical Events)',

    // Toast
    toastAlignedTo: 'कडे संरेखित',
    toastOffsetReset: 'ऑफसेट रीसेट 0° (Offset Reset)',
    toastOffset: 'होकायंत्र ऑफसेट',

    // Zoom Target Options
    zoomTargetSectionTitle: 'झूम पर्याय (Zoom Options - 3D किंवा मजकूर)',
    zoomTargetSectionDesc: 'पिंच किंवा झूम करताना काय मोठे/लहान व्हावे ते निवडा',
    zoomTargetBoth: '3D आकाश + मजकूर (Both)',
    zoomTargetBothShort: '3D + मजकूर',
    zoomTargetBothDesc: 'आकाशाचे 3D दृश्य आणि सर्व नावे/मजकूर एकत्र झूम होतात',
    zoomTarget3D: 'फक्त 3D आकाश (3D Sky Only)',
    zoomTarget3DShort: '3D आकाश',
    zoomTarget3DDesc: 'खोल दुर्बिणी दृश्य झूम करा, मजकुराचा आकार स्थिर व वाचनीय राहतो',
    zoomTargetText: 'फक्त मजकूर आणि नावे (Text Only)',
    zoomTargetTextShort: 'फक्त मजकूर',
    zoomTargetTextDesc: 'आकाश स्थिर राहते, नक्षत्र आणि ताऱ्यांच्या नावांचा आकार मोठा/लहान करा',
    zoomScale3DLabel: '3D आकाशीय झूम (3D Sky Zoom)',
    zoomScaleTextLabel: 'मजकूर फॉन्ट आकार (Text Label Size)',
    zoomModeActive: 'सक्रिय झूम मोड',
    zoomModeHUD: 'झूम मोड',

    // Tooltip Help
    tooltipHelpTitle: 'टूलटिप मदत (Tooltip Help)',
    tooltipHelpCheckboxLabel: 'स्क्रीनवर टूलटिप आणि मदत सूचना दाखवा',
    tooltipHelpDesc: 'पिंच-टू-झूम, पॅन, बटणांचे वर्णन आणि खगोलीय मार्गदर्शन टूलटिप्स सक्षम करा',
    gestureGuideTooltip: '💡 दोन बोटांनी पिंच करून झूम करा · ड्रॅग करून आकाश फिरवा · कोणत्याही ताऱ्यावर/नक्षत्रावर टॅप करा',
    tooltipHelpActive: 'टूलटिप सक्रिय',
    tooltipHelpDisabled: 'टूलटिप निष्क्रिय',

    // Perspective Views (Sky, AR, Earth Globe)
    perspectiveMode: 'दृष्टिकोन दृश्य (Perspective)',
    perspectiveSky: 'आकाश दृश्य (Sky Dome)',
    perspectiveSkyDesc: 'पृथ्वीच्या पृष्ठभागावरून आकाशीय क्षितिज घुमट पाहा',
    perspectiveAR: 'एआर कॅमेरा (AR Camera)',
    perspectiveARDesc: 'वास्तविक कॅमेरा क्षितिजावर आकाशीय नक्षत्र आच्छादन',
    perspectiveGlobe: 'पृथ्वी प्रक्षेपण (Earth Globe)',
    perspectiveGlobeDesc: 'पृथ्वी गोलावर सर्व 3D ग्रह व नक्षत्रांचे प्रक्षेपण',
    globeRotateHint: '💡 पृथ्वी 3D मध्ये फिरवण्यासाठी ड्रॅग करा · झूम करण्यासाठी 2 बोटांनी पिंच करा · कोणत्याही ग्रहावर/नक्षत्रावर टॅप करा',
    resetGlobeView: 'निरीक्षक स्थानावर केंद्रित करा',
    observerLocationBeacon: 'तुमचे स्थान (Observer Location)',
    subPlanetaryPoint: 'उप-ग्रह बिंदू (Sub-planetary Zenith)',
    observerHorizon: 'निरीक्षकाचे दृश्य क्षितिज (Observer Horizon)',
    globeZoom3DLabel: '3D पृथ्वी गोल झूम (Globe Zoom)',
    globeTerminator: 'दिवस व रात्र विभाजक (Day/Night Terminator)',
  },

  en: {
    // App Header
    appName: 'Nakshatra Darpana',
    appSubtitle: 'Vedic Sky & Ephemeris',
    moon: 'Moon',
    pada: 'Pada',
    changeLocation: 'Change Location',
    arActive: 'AR Active',
    nightVisionEnable: 'Night Vision (Red Sky Mode)',
    nightVisionDisable: 'Disable Night Vision',
    displayLayers: 'Display Layers',
    nakshatraShapes: 'Nakshatra Shapes & Asterisms',
    starLabels: 'Star & Nakshatra Labels',
    planetsNavagrahas: 'Planets (Navagrahas)',
    horizonCompass: 'Horizon & Cardinal Compass',
    eclipticPath: 'Ecliptic Path (Sun / Moon)',
    mapSettings: 'Map Alignment & Settings',

    // Tabs
    tabSky: 'Sky',
    tabNakshatras: 'Nakshatras',
    tabPlanets: 'Planets',
    tabTransits: 'Transits',
    tabHistory: 'History',

    // Settings Modal
    settingsTitle: 'Map Alignment & Settings',
    settingsSubtitle: 'Compass Alignment, Sensitivity & Language',
    closeSettings: 'Close Settings',

    // Language Section in Settings
    languageTitle: 'Language & Localization',
    languageSubtitle: 'Select your preferred application language',
    activeLanguage: 'Active Language',
    upcomingLanguagesTitle: 'Upcoming Indian Languages (Coming Soon)',
    upcomingLanguagesNote: 'More regional Indian languages will be added soon:',

    // Alignment Instructions
    alignmentGuideTitle: 'How to Align:',
    alignmentStep1: '1. Point your phone directly towards the real Sun, North, West, or South.',
    alignmentStep2: '2. Tap the matching button below — the sky map immediately snaps into alignment.',
    quickAlignTitle: 'Quick Align Buttons',
    sensorActiveLabel: 'Sensor Active',
    manualModeLabel: 'Manual Mode',

    // Cardinal buttons
    alignToSun: 'Align towards the Sun',
    sunDayVisible: 'Visible in Day',
    sunBelowHorizon: 'Below Horizon',
    azimuth: 'Azimuth (Az)',
    altitude: 'Altitude (Alt)',
    alignSunBtn: 'Align ☀️',

    north: 'North',
    northDegree: '0°',
    pointNorth: 'Point phone facing North',

    west: 'West',
    westDegree: '270°',
    pointWest: 'Point phone facing West',

    south: 'South',
    southDegree: '180°',
    pointSouth: 'Point phone facing South',

    east: 'East',
    eastDegree: '90°',
    pointEast: 'Point phone facing East',

    alignToMoon: 'Align towards the Moon',
    moonAboveHorizon: 'Above Horizon',
    moonBelowHorizon: 'Below Horizon',

    // Sensor Sensitivity
    sensitivityTitle: 'Sensor Panning Sensitivity:',
    sensitivityDesc: 'Adjust sensor responsiveness & motion smoothing',
    smooth: 'Smooth',
    balanced: 'Balanced',
    fast: 'Fast',
    ultra: 'Ultra',
    smoothDesc: 'Smooth',
    balancedDesc: 'Normal',
    fastDesc: 'Fast',
    ultraDesc: 'Ultra',

    // Manual Offset & AR
    fineOffsetTitle: 'Fine Compass Offset:',
    arDimmerTitle: 'AR Background Dimmer:',
    switchCamera: 'Switch Camera',
    rearCamera: 'Rear',
    frontCamera: 'Front',
    resetOffset: 'Reset 0°',
    sensorLocked: 'Sensor Locked ✓',
    relockSensor: 'Re-lock Sensor',

    // Bottom Helper Ribbon
    helperAr: 'Point camera at horizon to view Nakshatras overlay',
    helperSensor: 'Quaternion tracking active · Move phone across the sky',
    helperTouch: 'Drag to pan sky or tap AR / compass button',

    // Time Controller
    timeLive: 'Live',
    timeSimulated: 'Simulation',
    timeResetNow: 'Reset to Now',
    stepHourBack: '-1 Hr',
    stepHourForward: '+1 Hr',
    stepDayBack: '-1 Day',
    stepDayForward: '+1 Day',

    // Sub-views titles
    nakshatrasDirectoryTitle: 'The 27 Vedic Nakshatras',
    nakshatrasDirectorySub: 'Explore the 27 lunar mansions from Ashwini to Revati. Tap any Nakshatra for geometric asterisms, junction stars, deities, and 4 Padas.',
    planetsTitle: 'Navagrahas Real-Time Ephemeris',
    planetsSub: 'Real-time sidereal positions, zodiac signs, Nakshatra quarters, and horizontal coordinates for the celestial bodies.',
    transitsTitle: 'Celestial Transit Push Notifications',
    transitsSub: 'Configure real-time transit alerts for upcoming Moon ingresses, planetary shifts into new Nakshatras, and eclipses.',
    historyTitle: 'Historical Astrological Database',

    // Toast
    toastAlignedTo: 'Aligned to',
    toastOffsetReset: 'Offset Reset 0°',
    toastOffset: 'Compass Offset',

    // Zoom Target Options
    zoomTargetSectionTitle: 'Zoom Target Options (3D or Text)',
    zoomTargetSectionDesc: 'Choose what scales when pinching or using zoom controls',
    zoomTargetBoth: '3D Sky + Text (Both)',
    zoomTargetBothShort: '3D + Text',
    zoomTargetBothDesc: 'Scales both celestial 3D FOV and text labels together',
    zoomTarget3D: '3D Sky Only',
    zoomTarget3DShort: '3D Sky',
    zoomTarget3DDesc: 'Telescopic FOV zoom while keeping label font sizes fixed and readable',
    zoomTargetText: 'Text Labels Only',
    zoomTargetTextShort: 'Text Only',
    zoomTargetTextDesc: 'Keeps sky FOV steady while enlarging Sanskrit/English label text sizes',
    zoomScale3DLabel: '3D Sky Zoom Level',
    zoomScaleTextLabel: 'Text Label Font Scale',
    zoomModeActive: 'Active Zoom Target',
    zoomModeHUD: 'Zoom Mode',

    // Tooltip Help
    tooltipHelpTitle: 'Tooltip Help',
    tooltipHelpCheckboxLabel: 'Show Tooltip Help & Guidance Hints',
    tooltipHelpDesc: 'Display guidance hints, pinch-to-zoom / pan gestures, and button helper tooltips',
    gestureGuideTooltip: '💡 Pinch with two fingers to zoom · Drag to pan the sky · Tap any star or Nakshatra to inspect',
    tooltipHelpActive: 'Tooltips Active',
    tooltipHelpDisabled: 'Tooltips Disabled',

    // Perspective Views (Sky, AR, Earth Globe)
    perspectiveMode: 'Perspective View',
    perspectiveSky: 'Sky Dome',
    perspectiveSkyDesc: 'Local observer looking upward at the celestial dome from ground horizon',
    perspectiveAR: 'AR Camera',
    perspectiveARDesc: 'Camera augmented reality overlay on real-world horizon',
    perspectiveGlobe: 'Earth Globe',
    perspectiveGlobeDesc: '3D Earth sphere with all celestial bodies & Nakshatras projected in orbit',
    globeRotateHint: '💡 Drag to rotate Earth sphere in 3D · Pinch with 2 fingers to zoom · Tap any projected planet or Nakshatra',
    resetGlobeView: 'Center on Observer Location',
    observerLocationBeacon: 'Observer Location',
    subPlanetaryPoint: 'Sub-planetary Zenith Point',
    observerHorizon: 'Observer Visible Horizon',
    globeZoom3DLabel: '3D Earth Globe Scale',
    globeTerminator: 'Day / Night Solar Terminator',
  },
} as const;

export type TranslationKey = keyof typeof translations['en'];

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey, fallback?: string) => string;
  languages: LanguageOption[];
  upcomingLanguages: UpcomingLanguage[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'skymap_selected_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
      if (saved && (saved === 'hi' || saved === 'mr' || saved === 'en')) {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'hi'; // Default to Hindi, with 1-tap switch to Marathi or English
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore localStorage errors
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const langDict = translations[language] || translations.hi;
    const value = (langDict as Record<string, string>)[key];
    if (value !== undefined) return value;
    const enValue = (translations.en as Record<string, string>)[key];
    return enValue ?? fallback ?? key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        upcomingLanguages: UPCOMING_INDIAN_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
