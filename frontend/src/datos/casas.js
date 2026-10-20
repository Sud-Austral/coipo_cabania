/**
 * Casas de veraneo de la Red de Bienestar CONAF — DATOS DE MAQUETA.
 *
 * Nombres, regiones y localidades: anexo de la solicitud de Bienestar (julio 2026).
 * Se excluyen las cuatro casas que la planilla de inmuebles clasifica solo como
 * HUÉSPEDES (Copiapó, Concepción, Santiago 1 y 2). Las de uso mixto
 * (VERANEO/HUÉSPEDES) se tratan como casas de veraneo, sin distinción.
 *
 * Capacidad, descripciones, fotos (stock) y tarifas son referenciales: se
 * reemplazan por la planilla oficial de inmuebles y el archivo Tarifas 2026.
 * Tarifa: valor por noche y por casa (Art. 19), igual para afiliados,
 * jubilados y trabajadores CONAF no afiliados.
 */

export const REGIONES = [
  {
    "codigo": "02",
    "nombre": "Antofagasta"
  },
  {
    "codigo": "03",
    "nombre": "Atacama"
  },
  {
    "codigo": "04",
    "nombre": "Coquimbo"
  },
  {
    "codigo": "05",
    "nombre": "Valparaíso"
  },
  {
    "codigo": "06",
    "nombre": "O'Higgins"
  },
  {
    "codigo": "07",
    "nombre": "Maule"
  },
  {
    "codigo": "08",
    "nombre": "Biobío"
  },
  {
    "codigo": "09",
    "nombre": "Araucanía"
  },
  {
    "codigo": "13",
    "nombre": "Metropolitana"
  },
  {
    "codigo": "14",
    "nombre": "Los Ríos"
  },
  {
    "codigo": "10",
    "nombre": "Los Lagos"
  },
  {
    "codigo": "11",
    "nombre": "Aysén"
  },
  {
    "codigo": "12",
    "nombre": "Magallanes"
  }
]

export const CASAS = [
  {
    "id": 1,
    "nombre": "Toconao",
    "region": "02",
    "localidad": "Toconao",
    "direccion": "Calle Lascar s/n, Toconao",
    "lat": -23.1897,
    "lng": -68.0016,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa de adobe restaurada en el pueblo de Toconao, a pasos de la iglesia San Lucas. Buen punto de partida para conocer el Salar de Atacama y la Reserva Nacional Los Flamencos.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Calefacción",
      "Wi-Fi"
    ],
    "fotos": [
      "ext-norte",
      "int-living-1",
      "int-dorm-1",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "R.N. Los Flamencos",
        "km": 12
      },
      {
        "nombre": "San Pedro de Atacama",
        "km": 38
      },
      {
        "nombre": "Posta rural de Toconao",
        "km": 0.4
      }
    ]
  },
  {
    "id": 2,
    "nombre": "Bahía Inglesa 1",
    "region": "03",
    "localidad": "Bahía Inglesa",
    "direccion": "Av. El Morro 120, Bahía Inglesa, Caldera",
    "lat": -27.1049,
    "lng": -70.8626,
    "capacidad": 8,
    "dormitorios": 4,
    "tarifa_noche": 40000,
    "descripcion": "Casa familiar a 400 metros de la playa La Piscina, la más protegida de Bahía Inglesa. Cuenta con terraza techada, quincho y estacionamiento para dos vehículos. Es uno de los inmuebles de mayor demanda de la red durante la temporada estival.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Terraza",
      "Estacionamiento",
      "Wi-Fi",
      "Quincho",
      "Aire acondicionado"
    ],
    "fotos": [
      "ext-norte",
      "int-living-3",
      "int-dorm-1",
      "int-cocina",
      "ent-playa"
    ],
    "cercanias": [
      {
        "nombre": "Playa La Piscina",
        "km": 0.4
      },
      {
        "nombre": "Playa Blanca",
        "km": 6
      },
      {
        "nombre": "Supermercado Caldera",
        "km": 5.5
      },
      {
        "nombre": "Hospital de Caldera",
        "km": 6.2
      }
    ]
  },
  {
    "id": 3,
    "nombre": "Bahía Inglesa 2",
    "region": "03",
    "localidad": "Bahía Inglesa",
    "direccion": "Av. El Morro 124, Bahía Inglesa, Caldera",
    "lat": -27.1055,
    "lng": -70.8631,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa contigua a la anterior, de tamaño algo menor, con acceso directo al sector de playa y estacionamiento propio.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Terraza",
      "Estacionamiento",
      "Wi-Fi"
    ],
    "fotos": [
      "ext-urbano-2",
      "int-living-3",
      "int-dorm-3",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Playa La Piscina",
        "km": 0.4
      },
      {
        "nombre": "Hospital de Caldera",
        "km": 6.2
      }
    ]
  },
  {
    "id": 5,
    "nombre": "La Serena",
    "region": "04",
    "localidad": "La Serena",
    "direccion": "Av. del Mar 3200, La Serena",
    "lat": -29.9296,
    "lng": -71.2739,
    "capacidad": 7,
    "dormitorios": 3,
    "tarifa_noche": 35000,
    "descripcion": "Casa a una cuadra de Avenida del Mar, con acceso peatonal directo a la playa Cuatro Esquinas y a quince minutos del centro histórico de La Serena. Cuenta con terraza, estacionamiento y es una de las opciones más pedidas para vacaciones familiares en el norte chico.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Terraza",
      "Estacionamiento",
      "Wi-Fi"
    ],
    "fotos": [
      "ext-costa-depto",
      "int-living-6",
      "int-dorm-1",
      "ent-playa"
    ],
    "cercanias": [
      {
        "nombre": "Playa Cuatro Esquinas",
        "km": 0.3
      },
      {
        "nombre": "Playa La Herradura",
        "km": 8.5
      },
      {
        "nombre": "Centro histórico de La Serena",
        "km": 4.2
      },
      {
        "nombre": "Hospital San Juan de Dios",
        "km": 5.1
      }
    ]
  },
  {
    "id": 6,
    "nombre": "Viña del Mar",
    "region": "05",
    "localidad": "Viña del Mar",
    "direccion": "5 Norte 820, Viña del Mar",
    "lat": -33.0153,
    "lng": -71.5503,
    "capacidad": 8,
    "dormitorios": 4,
    "tarifa_noche": 40000,
    "descripcion": "Casa amplia en sector residencial de Viña del Mar, a diez minutos caminando de la playa Acapulco y bien conectada al transporte público. Es el inmueble más solicitado de la región durante todo el año, tanto para descanso familiar como para atenciones médicas en la red de salud de Valparaíso.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Calefacción",
      "Wi-Fi",
      "Lavadora",
      "Estacionamiento",
      "Patio"
    ],
    "fotos": [
      "ext-casa-amplia",
      "int-living-2",
      "int-dorm-4",
      "int-living-6",
      "ent-playa"
    ],
    "cercanias": [
      {
        "nombre": "Playa Acapulco",
        "km": 0.9
      },
      {
        "nombre": "Jardín Botánico Nacional",
        "km": 7.4
      },
      {
        "nombre": "Hospital Gustavo Fricke",
        "km": 2.6
      },
      {
        "nombre": "Supermercado 15 Norte",
        "km": 1.2
      }
    ]
  },
  {
    "id": 7,
    "nombre": "Las Cruces",
    "region": "05",
    "localidad": "Las Cruces",
    "direccion": "Errázuriz 145, Las Cruces, El Tabo",
    "lat": -33.4938,
    "lng": -71.6291,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa de balneario tradicional frente al sector de la caleta, con vista al mar desde la terraza.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Terraza",
      "Estacionamiento",
      "Wi-Fi"
    ],
    "fotos": [
      "ext-costa-casa",
      "int-living-6",
      "int-dorm-2",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Playa Las Cruces",
        "km": 0.2
      },
      {
        "nombre": "Santuario de la Naturaleza Isla de Pájaros Niños",
        "km": 8
      },
      {
        "nombre": "Cesfam El Tabo",
        "km": 3.1
      }
    ]
  },
  {
    "id": 8,
    "nombre": "Rocas de Santo Domingo",
    "region": "05",
    "localidad": "Rocas de Santo Domingo",
    "direccion": "Av. del Mar 45, Santo Domingo",
    "lat": -33.6389,
    "lng": -71.6294,
    "capacidad": 8,
    "dormitorios": 4,
    "tarifa_noche": 40000,
    "descripcion": "Casa en sector residencial arbolado de Rocas de Santo Domingo, a corta distancia de la desembocadura del río Maipo.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Terraza",
      "Estacionamiento",
      "Wi-Fi",
      "Quincho"
    ],
    "fotos": [
      "ext-patrimonial",
      "int-living-7",
      "int-dorm-3",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Playa Santo Domingo",
        "km": 0.6
      },
      {
        "nombre": "Humedal río Maipo",
        "km": 4.5
      },
      {
        "nombre": "San Antonio (centro)",
        "km": 9.2
      }
    ]
  },
  {
    "id": 9,
    "nombre": "R.N. Lago Peñuelas",
    "region": "05",
    "localidad": "R.N. Lago Peñuelas",
    "direccion": "Ruta 68 km 87, Reserva Nacional Lago Peñuelas",
    "lat": -33.1531,
    "lng": -71.5164,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa dentro de la Reserva Nacional Lago Peñuelas, en entorno de bosque y con acceso controlado por la administración de la unidad.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-bosque",
      "int-living-1",
      "int-dorm-4",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "R.N. Lago Peñuelas",
        "km": 0.1
      },
      {
        "nombre": "Curacaví",
        "km": 28
      },
      {
        "nombre": "Valparaíso",
        "km": 32
      }
    ]
  },
  {
    "id": 10,
    "nombre": "Pichilemu 1",
    "region": "06",
    "localidad": "Pichilemu",
    "direccion": "Av. Costanera 380, Pichilemu",
    "lat": -34.3868,
    "lng": -72.0086,
    "capacidad": 7,
    "dormitorios": 3,
    "tarifa_noche": 35000,
    "descripcion": "Casa frente a la costanera de Pichilemu, con vista al mar desde el living y la terraza. A pocos minutos de Playa Principal y del sector de Punta de Lobos, referente mundial del surf. Muy solicitada en temporada estival y fines de semana largos.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Terraza",
      "Estacionamiento",
      "Wi-Fi"
    ],
    "fotos": [
      "ext-rural",
      "int-living-2",
      "int-dorm-2",
      "ent-playa"
    ],
    "cercanias": [
      {
        "nombre": "Playa Principal",
        "km": 0.3
      },
      {
        "nombre": "Punta de Lobos",
        "km": 6.4
      },
      {
        "nombre": "Laguna El Perro",
        "km": 2.8
      },
      {
        "nombre": "Hospital de Pichilemu",
        "km": 1.7
      }
    ]
  },
  {
    "id": 11,
    "nombre": "Pichilemu 2",
    "region": "06",
    "localidad": "Pichilemu",
    "direccion": "Aníbal Pinto 210, Pichilemu",
    "lat": -34.3901,
    "lng": -72.0021,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa en sector céntrico de Pichilemu, a tres cuadras del comercio y a diez minutos caminando de la playa.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Terraza",
      "Estacionamiento",
      "Wi-Fi"
    ],
    "fotos": [
      "ext-costa-casa",
      "int-living-3",
      "int-dorm-2",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Playa Principal",
        "km": 0.8
      },
      {
        "nombre": "Supermercado Pichilemu",
        "km": 0.4
      }
    ]
  },
  {
    "id": 12,
    "nombre": "Pichilemu 3",
    "region": "06",
    "localidad": "Pichilemu",
    "direccion": "Ortúzar 55, Pichilemu",
    "lat": -34.3925,
    "lng": -72.0055,
    "capacidad": 8,
    "dormitorios": 4,
    "tarifa_noche": 40000,
    "descripcion": "Casa en Pichilemu, cerca del centro y de las playas de la provincia de Cardenal Caro.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Calefacción",
      "Wi-Fi"
    ],
    "fotos": [
      "ext-suburbano",
      "int-living-4",
      "int-dorm-3",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Oficina Provincial CONAF",
        "km": 0.6
      },
      {
        "nombre": "Hospital de Pichilemu",
        "km": 1.4
      }
    ]
  },
  {
    "id": 13,
    "nombre": "R.N. Laguna Torca",
    "region": "07",
    "localidad": "R.N. Laguna Torca",
    "direccion": "Reserva Nacional Laguna Torca, Vichuquén",
    "lat": -34.7644,
    "lng": -72.0672,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa en la Reserva Nacional Laguna Torca, área de humedales y avistamiento de cisnes de cuello negro, contigua al Lago Vichuquén.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-cabana",
      "int-living-5",
      "int-dorm-4",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "R.N. Laguna Torca",
        "km": 0.1
      },
      {
        "nombre": "Lago Vichuquén",
        "km": 3.8
      },
      {
        "nombre": "Llico",
        "km": 5.2
      }
    ]
  },
  {
    "id": 14,
    "nombre": "Vilches",
    "region": "07",
    "localidad": "Vilches",
    "direccion": "Sector Vilches Alto, San Clemente",
    "lat": -35.5967,
    "lng": -71.0672,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa de montaña en Vilches Alto, puerta de entrada a la Reserva Nacional Altos de Lircay y a los senderos hacia el Enladrillado y la Laguna del Alto. Entorno de bosque nativo de robles y coigües, con estufa a leña para las noches frías de la precordillera del Maule.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-lago-montana",
      "int-living-5",
      "int-dorm-4",
      "ent-montana"
    ],
    "cercanias": [
      {
        "nombre": "R.N. Altos de Lircay",
        "km": 2.1
      },
      {
        "nombre": "Sendero El Enladrillado",
        "km": 3.5
      },
      {
        "nombre": "Posta rural de Vilches",
        "km": 1.8
      },
      {
        "nombre": "San Clemente (comercio)",
        "km": 52
      }
    ]
  },
  {
    "id": 15,
    "nombre": "Radal 7 Tazas",
    "region": "07",
    "localidad": "Radal 7 Tazas",
    "direccion": "P.N. Radal Siete Tazas, Molina",
    "lat": -35.4744,
    "lng": -70.9808,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa de montaña en el Parque Nacional Radal Siete Tazas, rodeada de bosque nativo y a corta caminata del sector de las tazas y el Salto La Leona. Cuenta con estufa a leña y terraza cubierta con vista al valle. Ideal para descanso familiar en temporada estival; en invierno el acceso puede requerir vehículo alto.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento",
      "Terraza",
      "Parrilla"
    ],
    "fotos": [
      "ext-cabana-2",
      "int-living-5",
      "int-dorm-2",
      "int-cocina",
      "ent-montana"
    ],
    "cercanias": [
      {
        "nombre": "Sector Siete Tazas",
        "km": 0.8
      },
      {
        "nombre": "Salto La Leona",
        "km": 1.4
      },
      {
        "nombre": "Parque Inglés",
        "km": 4.2
      },
      {
        "nombre": "Molina (comercio y servicios)",
        "km": 71
      }
    ]
  },
  {
    "id": 16,
    "nombre": "El Belloto",
    "region": "07",
    "localidad": "El Belloto",
    "direccion": "Sector El Belloto, Constitución",
    "lat": -35.4258,
    "lng": -72.3489,
    "capacidad": 5,
    "dormitorios": 2,
    "tarifa_noche": 25000,
    "descripcion": "Casa de apoyo a las labores de la provincia de Talca y el borde costero del Maule.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Calefacción",
      "Wi-Fi"
    ],
    "fotos": [
      "ext-bosque",
      "int-living-1",
      "int-dorm-3",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Constitución",
        "km": 18
      },
      {
        "nombre": "Playa Putú",
        "km": 26
      }
    ]
  },
  {
    "id": 18,
    "nombre": "Temuco",
    "region": "09",
    "localidad": "Temuco",
    "direccion": "Bulnes 590, Temuco",
    "lat": -38.7359,
    "lng": -72.5904,
    "capacidad": 8,
    "dormitorios": 4,
    "tarifa_noche": 40000,
    "descripcion": "Casa en el centro de Temuco, cerca de servicios y a corta distancia de los parques nacionales de La Araucanía.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Calefacción",
      "Wi-Fi",
      "Lavadora"
    ],
    "fotos": [
      "ext-urbano-2",
      "int-living-2",
      "int-dorm-4",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Hospital Dr. Hernán Henríquez",
        "km": 2.2
      },
      {
        "nombre": "Dirección Regional CONAF",
        "km": 0.8
      },
      {
        "nombre": "Terminal de buses",
        "km": 1.9
      }
    ]
  },
  {
    "id": 19,
    "nombre": "P.N. Conguillío",
    "region": "09",
    "localidad": "P.N. Conguillío",
    "direccion": "Sector Laguna Verde, P.N. Conguillío, Melipeuco",
    "lat": -38.6864,
    "lng": -71.6539,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa dentro del Parque Nacional Conguillío, entre araucarias milenarias y con vista al volcán Llaima. El entorno incluye el lago Conguillío, la Laguna Verde y senderos de todos los niveles. En invierno el sector recibe nieve y el acceso puede requerir vehículo alto.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-nieve",
      "int-living-4",
      "int-dorm-2",
      "ent-montana"
    ],
    "cercanias": [
      {
        "nombre": "Lago Conguillío",
        "km": 1.2
      },
      {
        "nombre": "Sendero Araucarias",
        "km": 2
      },
      {
        "nombre": "Laguna Verde",
        "km": 3.4
      },
      {
        "nombre": "Volcan Llaima (mirador)",
        "km": 8.6
      }
    ]
  },
  {
    "id": 20,
    "nombre": "R.N. Malalcahuello",
    "region": "09",
    "localidad": "R.N. Malalcahuello",
    "direccion": "R.N. Malalcahuello, Curacautín",
    "lat": -38.4547,
    "lng": -71.5836,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa en la Reserva Nacional Malalcahuello, cercana al volcán Lonquimay y a los centros de esquí de la zona.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-lago-montana",
      "int-living-4",
      "int-dorm-2",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "R.N. Malalcahuello",
        "km": 0.2
      },
      {
        "nombre": "Corralco (centro de esquí)",
        "km": 14
      },
      {
        "nombre": "Curacautín",
        "km": 31
      }
    ]
  },
  {
    "id": 21,
    "nombre": "Valdivia",
    "region": "14",
    "localidad": "Valdivia",
    "direccion": "General Lagos 950, Valdivia",
    "lat": -39.8196,
    "lng": -73.2452,
    "capacidad": 7,
    "dormitorios": 3,
    "tarifa_noche": 35000,
    "descripcion": "Casa en el barrio histórico de Valdivia, a orillas del río Calle Calle y a corta caminata de la Feria Fluvial y la costanera.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Calefacción",
      "Wi-Fi",
      "Lavadora"
    ],
    "fotos": [
      "ext-patrimonial",
      "int-living-7",
      "int-dorm-3",
      "ent-bosque"
    ],
    "cercanias": [
      {
        "nombre": "Costanera y Feria Fluvial",
        "km": 1.1
      },
      {
        "nombre": "Hospital Base Valdivia",
        "km": 2.4
      },
      {
        "nombre": "Parque Saval",
        "km": 3.6
      },
      {
        "nombre": "Isla Teja y Jardín Botánico",
        "km": 2.2
      }
    ]
  },
  {
    "id": 22,
    "nombre": "P.N. Puyehue 1",
    "region": "10",
    "localidad": "P.N. Puyehue",
    "direccion": "Sector Aguas Calientes, P.N. Puyehue, Puyehue",
    "lat": -40.7381,
    "lng": -72.3086,
    "capacidad": 8,
    "dormitorios": 4,
    "tarifa_noche": 40000,
    "descripcion": "Casa en el sector Aguas Calientes del Parque Nacional Puyehue, rodeada de bosque valdiviano y a corta distancia de las termas y del sendero al Salto del Indio. Incluye estufa a leña, quincho techado y estacionamiento. Es uno de los destinos preferidos de la red para descanso familiar durante todo el año.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento",
      "Quincho",
      "Terraza",
      "Wi-Fi"
    ],
    "fotos": [
      "ext-lodge",
      "int-living-4",
      "int-dorm-3",
      "int-living-7",
      "ent-bosque"
    ],
    "cercanias": [
      {
        "nombre": "Termas de Aguas Calientes",
        "km": 0.6
      },
      {
        "nombre": "Sendero Salto del Indio",
        "km": 4.3
      },
      {
        "nombre": "Antillanca (centro de montaña)",
        "km": 18
      },
      {
        "nombre": "Entre Lagos (comercio)",
        "km": 22
      }
    ]
  },
  {
    "id": 23,
    "nombre": "P.N. Puyehue 2",
    "region": "10",
    "localidad": "P.N. Puyehue",
    "direccion": "Sector Aguas Calientes, P.N. Puyehue, Puyehue",
    "lat": -40.7392,
    "lng": -72.3098,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Segunda casa del sector Aguas Calientes, de tamaño menor, con las mismas comodidades y acceso a las termas.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-cabana",
      "int-living-7",
      "int-dorm-1",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Termas de Aguas Calientes",
        "km": 0.6
      },
      {
        "nombre": "Entre Lagos",
        "km": 22
      }
    ]
  },
  {
    "id": 24,
    "nombre": "P.N. Puyehue 3 (Anticura)",
    "region": "10",
    "localidad": "P.N. Puyehue",
    "direccion": "Sector Anticura, P.N. Puyehue",
    "lat": -40.6564,
    "lng": -72.1817,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa en el sector Anticura del Parque Nacional Puyehue, rodeada de bosque y senderos.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-cabana-2",
      "int-living-1",
      "int-dorm-2",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Sector Anticura",
        "km": 0.2
      },
      {
        "nombre": "Paso Cardenal Samoré",
        "km": 22
      }
    ]
  },
  {
    "id": 25,
    "nombre": "Puerto Montt 2",
    "region": "10",
    "localidad": "Puerto Montt",
    "direccion": "Ejército 320, Puerto Montt",
    "lat": -41.4693,
    "lng": -72.9424,
    "capacidad": 8,
    "dormitorios": 4,
    "tarifa_noche": 40000,
    "descripcion": "Casa en Puerto Montt, puerta de entrada a Chiloé y a la Carretera Austral.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Calefacción",
      "Wi-Fi",
      "Lavadora"
    ],
    "fotos": [
      "ext-urbano",
      "int-living-2",
      "int-dorm-3",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Hospital de Puerto Montt",
        "km": 2.8
      },
      {
        "nombre": "Terminal de buses",
        "km": 1.5
      },
      {
        "nombre": "Aeropuerto El Tepual",
        "km": 14
      }
    ]
  },
  {
    "id": 26,
    "nombre": "Puerto Montt 1 (Pelluco)",
    "region": "10",
    "localidad": "Puerto Montt",
    "direccion": "Camino a Pelluco 1450, Puerto Montt",
    "lat": -41.4813,
    "lng": -72.8956,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa en el sector de Pelluco, con vista al seno de Reloncaví y cercana a la playa.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Terraza",
      "Estacionamiento",
      "Wi-Fi",
      "Estufa a leña"
    ],
    "fotos": [
      "ext-rural",
      "int-living-3",
      "int-dorm-4",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "Playa Pelluco",
        "km": 0.7
      },
      {
        "nombre": "Puerto Montt (centro)",
        "km": 5.1
      }
    ]
  },
  {
    "id": 27,
    "nombre": "Coyhaique",
    "region": "11",
    "localidad": "Coyhaique",
    "direccion": "Lautaro 240, Coyhaique",
    "lat": -45.5712,
    "lng": -72.0685,
    "capacidad": 8,
    "dormitorios": 4,
    "tarifa_noche": 40000,
    "descripcion": "Casa en Coyhaique, base para recorrer la región de Aysén y la Carretera Austral.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Calefacción",
      "Wi-Fi",
      "Lavadora"
    ],
    "fotos": [
      "ext-suburbano",
      "int-living-3",
      "int-dorm-4",
      "ent-patagonia"
    ],
    "cercanias": [
      {
        "nombre": "Hospital Regional de Coyhaique",
        "km": 1.4
      },
      {
        "nombre": "R.N. Coyhaique",
        "km": 5.6
      },
      {
        "nombre": "Dirección Regional CONAF",
        "km": 0.7
      },
      {
        "nombre": "Plaza de Armas y comercio",
        "km": 0.4
      }
    ]
  },
  {
    "id": 28,
    "nombre": "La Junta",
    "region": "11",
    "localidad": "La Junta",
    "direccion": "Antonio Varas s/n, La Junta",
    "lat": -43.9722,
    "lng": -72.4033,
    "capacidad": 5,
    "dormitorios": 2,
    "tarifa_noche": 25000,
    "descripcion": "Casa en La Junta, punto de descanso en la Carretera Austral, cerca de termas y ríos.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-cabana",
      "int-living-5",
      "int-dorm-2",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "P.N. Queulat",
        "km": 68
      },
      {
        "nombre": "Posta rural La Junta",
        "km": 0.5
      }
    ]
  },
  {
    "id": 29,
    "nombre": "Cochrane",
    "region": "11",
    "localidad": "Cochrane",
    "direccion": "Esmeralda 398, Cochrane",
    "lat": -47.2539,
    "lng": -72.5747,
    "capacidad": 5,
    "dormitorios": 2,
    "tarifa_noche": 25000,
    "descripcion": "Casa en Cochrane, apoyo a las unidades del extremo sur de la región de Aysén.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-nieve",
      "int-living-6",
      "int-dorm-3",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "R.N. Tamango",
        "km": 6.2
      },
      {
        "nombre": "Hospital de Cochrane",
        "km": 0.9
      }
    ]
  },
  {
    "id": 30,
    "nombre": "Punta Arenas",
    "region": "12",
    "localidad": "Punta Arenas",
    "direccion": "José Menéndez 1025, Punta Arenas",
    "lat": -53.1638,
    "lng": -70.9171,
    "capacidad": 8,
    "dormitorios": 4,
    "tarifa_noche": 40000,
    "descripcion": "Casa en el centro de Punta Arenas, a pocas cuadras de la Plaza Muñoz Gamero, con conexión hacia Torres del Paine y Tierra del Fuego. Calefacción central en todas las dependencias.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Calefacción",
      "Wi-Fi",
      "Lavadora",
      "Calefacción central",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-urbano",
      "int-living-1",
      "int-dorm-4",
      "int-cocina",
      "ent-paine"
    ],
    "cercanias": [
      {
        "nombre": "Plaza Muñoz Gamero",
        "km": 0.6
      },
      {
        "nombre": "Hospital Clínico de Magallanes",
        "km": 2.3
      },
      {
        "nombre": "Dirección Regional CONAF",
        "km": 1.1
      },
      {
        "nombre": "Terminal de buses",
        "km": 1.8
      }
    ]
  },
  {
    "id": 33,
    "nombre": "P.N. Río Clarillo 1",
    "region": "13",
    "localidad": "P.N. Río Clarillo",
    "direccion": "P.N. Río Clarillo, Pirque",
    "lat": -33.7261,
    "lng": -70.4808,
    "capacidad": 6,
    "dormitorios": 3,
    "tarifa_noche": 30000,
    "descripcion": "Casa en el Parque Nacional Río Clarillo, en Pirque, a menos de una hora de Santiago. Entorno de bosque esclerófilo junto al río.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento",
      "Quincho"
    ],
    "fotos": [
      "ext-bosque",
      "int-living-1",
      "int-dorm-1",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "P.N. Río Clarillo",
        "km": 0.1
      },
      {
        "nombre": "Pirque (comercio)",
        "km": 17
      },
      {
        "nombre": "Santiago",
        "km": 45
      }
    ]
  },
  {
    "id": 34,
    "nombre": "P.N. Río Clarillo 2",
    "region": "13",
    "localidad": "P.N. Río Clarillo",
    "direccion": "Administración P.N. Río Clarillo, Pirque",
    "lat": -33.7275,
    "lng": -70.4822,
    "capacidad": 5,
    "dormitorios": 2,
    "tarifa_noche": 25000,
    "descripcion": "Casa contigua a la administración del Parque Nacional Río Clarillo, a una hora de Santiago.",
    "equipamiento": [
      "Cocina equipada",
      "Ropa de cama",
      "Estufa a leña",
      "Estacionamiento"
    ],
    "fotos": [
      "ext-cabana",
      "int-living-2",
      "int-dorm-2",
      "int-cocina"
    ],
    "cercanias": [
      {
        "nombre": "P.N. Río Clarillo",
        "km": 0.1
      },
      {
        "nombre": "Pirque",
        "km": 17
      }
    ]
  }
]
