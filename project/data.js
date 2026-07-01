// Datos ficticios para Iglesia Cristiana Renacer (Santiago, RD)
window.EVO_DATA = {
  church: {
    name: "Comunidad Cristiana Renacer",
    short: "ICCR",
    location: "Santiago de los Caballeros, RD",
    pastor: "Pastor Roberto Almonte",
  },
  user: {
    name: "Roberto Almonte",
    initials: "RA",
    role: "Pastor Principal",
    email: "pastor@renacer.do",
  },
  members: [
    { id: 1, name: "María Altagracia Peña", phone: "(809) 555-0142", role: "Diaconisa", status: "Activo", joined: "Mar 2018", attendance: 96, given: 42500, sector: "Los Jardines", initials: "MP", ministerio: "Ministerio de Mujeres", nacionalidad: "Dominicana" },
    { id: 2, name: "José Manuel Frías", phone: "(829) 555-0177", role: "Líder de Jóvenes", status: "Activo", joined: "Ago 2020", attendance: 88, given: 28100, sector: "Cienfuegos", initials: "JF", ministerio: "Ministerio de Jóvenes", nacionalidad: "Venezolano" },
    { id: 3, name: "Yokasta Mejía Reynoso", phone: "(849) 555-0203", role: "Coro", status: "Activo", joined: "Ene 2017", attendance: 92, given: 31750, sector: "Pueblo Nuevo", initials: "YM", ministerio: "Ministerio de Adoración", nacionalidad: "Dominicana" },
    { id: 4, name: "Wilkin Almonte Tavárez", phone: "(809) 555-0398", role: "Tesorero", status: "Activo", joined: "Jun 2015", attendance: 100, given: 65000, sector: "El Embrujo", initials: "WA", ministerio: "Ministerio de Finanzas", nacionalidad: "Dominicano" },
    { id: 5, name: "Altagracia Núñez", phone: "(829) 555-0411", role: "Miembro", status: "Inactivo", joined: "Feb 2022", attendance: 34, given: 4200, sector: "Los Cerros", initials: "AN", ministerio: "—", nacionalidad: "Haitiana" },
    { id: 6, name: "Francisco Báez Polanco", phone: "(809) 555-0567", role: "Diácono", status: "Activo", joined: "May 2014", attendance: 98, given: 58200, sector: "La Trinitaria", initials: "FB", ministerio: "Ministerio de Diáconos", nacionalidad: "Dominicano" },
    { id: 7, name: "Carmen Rosario Liriano", phone: "(849) 555-0612", role: "Escuela Dominical", status: "Activo", joined: "Sep 2019", attendance: 90, given: 18900, sector: "Los Jardines", initials: "CR", ministerio: "Escuela Dominical", nacionalidad: "Colombiana" },
    { id: 8, name: "Juan Carlos Veras", phone: "(809) 555-0654", role: "Miembro", status: "Pendiente", joined: "Mar 2026", attendance: 60, given: 1500, sector: "Bella Vista", initials: "JV", ministerio: "—", nacionalidad: "Dominicano" },
    { id: 9, name: "Elsa Patricia Hernández", phone: "(829) 555-0701", role: "Intercesión", status: "Activo", joined: "Nov 2016", attendance: 94, given: 38500, sector: "Cerros de Gurabo", initials: "EH", ministerio: "Ministerio de Intercesión", nacionalidad: "Venezolana" },
    { id: 10, name: "Rafael Antonio Disla", phone: "(849) 555-0809", role: "Sonido", status: "Activo", joined: "Ago 2021", attendance: 82, given: 12300, sector: "Pekín", initials: "RD", ministerio: "Ministerio de Sonido", nacionalidad: "Dominicano" },
    { id: 11, name: "Mercedes Brito Sosa", phone: "(809) 555-0922", role: "Coro", status: "Activo", joined: "Abr 2018", attendance: 86, given: 22400, sector: "Los Jardines", initials: "MB", ministerio: "Ministerio de Adoración", nacionalidad: "Estados Unidos" },
    { id: 12, name: "Cristian Alberto Ureña", phone: "(829) 555-1011", role: "Líder de Jóvenes", status: "Activo", joined: "Ene 2023", attendance: 78, given: 9800, sector: "El Ensueño", initials: "CU", ministerio: "Ministerio de Jóvenes", nacionalidad: "Haitiano" },
  ],
  events: [
    { id: 1, title: "Culto Dominical", date: "2026-05-10", time: "9:00 AM", type: "culto", attendees: 312, location: "Templo Principal" },
    { id: 2, title: "Servicio de Jóvenes 'Encendidos'", date: "2026-05-15", time: "7:30 PM", type: "evento", attendees: 84, location: "Salón de Jóvenes" },
    { id: 3, title: "Estudio Bíblico — Romanos 8", date: "2026-05-13", time: "7:00 PM", type: "estudio", attendees: 56, location: "Templo Principal" },
    { id: 4, title: "Vigilia de Oración", date: "2026-05-22", time: "10:00 PM", type: "evento", attendees: 0, location: "Templo Principal" },
    { id: 5, title: "Reunión de Diáconos", date: "2026-05-12", time: "8:00 PM", type: "estudio", attendees: 8, location: "Sala Pastoral" },
    { id: 6, title: "Culto Dominical", date: "2026-05-17", time: "9:00 AM", type: "culto", attendees: 0, location: "Templo Principal" },
    { id: 7, title: "Bautismos en el Río Yaque", date: "2026-05-24", time: "8:00 AM", type: "evento", attendees: 0, location: "Río Yaque del Norte" },
  ],
  funds: [
    { id: 1, name: "Fondo General", balance: 845230.50, change: 12.4, goal: 1000000, active: true, primary: true,  startDate: "2014-01-01", description: "Operación diaria de la iglesia: utilidades, salarios y materiales." },
    { id: 2, name: "Construcción del Templo", balance: 1284500.00, change: 8.1, goal: 2500000, active: true, primary: false, startDate: "2022-04-15", description: "Ampliación del santuario principal — Fase 2." },
    { id: 3, name: "Misiones — Haití", balance: 158420.00, change: -2.3, goal: 200000, active: true, primary: false, startDate: "2019-09-01", description: "Apoyo mensual a la iglesia hermana en Puerto Príncipe." },
    { id: 4, name: "Beneficencia Social", balance: 92750.00, change: 24.7, goal: 150000, active: true, primary: false, startDate: "2018-02-10", description: "Ayudas puntuales a familias y emergencias médicas." },
    { id: 5, name: "Becas Estudiantiles", balance: 38400.00, change: 0, goal: 100000, active: false, primary: false, startDate: "2023-01-20", description: "Apoyo a jóvenes de la congregación con estudios universitarios." },
    { id: 6, name: "Cena Navideña", balance: 27600.00, change: 31.2, goal: 25000, active: true, primary: false, startDate: "2024-11-01", description: "Recolección para la cena y canastas navideñas de la comunidad." },
    { id: 7, name: "Ministerio de Jóvenes", balance: 19850.00, change: 6.8, goal: 30000, active: true, primary: false, startDate: "2020-08-15", description: "Actividades, retiros y materiales para el ministerio juvenil." },
    { id: 8, name: "Mantenimiento del Templo", balance: 14200.00, change: -1.4, goal: 50000, active: true, primary: false, startDate: "2016-03-05", description: "Pintura, reparaciones menores, jardinería y limpieza." },
  ],
  // En INGRESOS, quien crea es la misma persona que autoriza (createdBy === authorizedBy)
  // y la autorización ocurre en el mismo instante. En EGRESOS hay separación:
  // una persona registra y otra (con permisos) autoriza. Si está Pendiente, authorizedBy es null.
  transactions: [
    { id: 1, date: "2026-05-08", desc: "Diezmo dominical", member: "Wilkin Almonte", amount: 12500, type: "Ingreso", fund: "General", method: "Efectivo", status: "Confirmado",
      createdBy: "Wilkin Almonte", createdAt: "2026-05-08 09:14", authorizedBy: "Wilkin Almonte", authorizedAt: "2026-05-08 09:14" },
    { id: 2, date: "2026-05-08", desc: "Ofrenda especial — construcción", member: "Francisco Báez", amount: 25000, type: "Ingreso", fund: "Construcción", method: "Transferencia", status: "Confirmado",
      createdBy: "Carmen Rosario", createdAt: "2026-05-08 10:02", authorizedBy: "Carmen Rosario", authorizedAt: "2026-05-08 10:02" },
    { id: 3, date: "2026-05-07", desc: "Pago electricidad EDENORTE", member: "—", amount: -8420, type: "Egreso", fund: "General", method: "Transferencia", status: "Confirmado",
      createdBy: "Wilkin Almonte", createdAt: "2026-05-07 08:30", authorizedBy: "Roberto Almonte", authorizedAt: "2026-05-07 14:20" },
    { id: 4, date: "2026-05-07", desc: "Diezmo", member: "María Altagracia Peña", amount: 6800, type: "Ingreso", fund: "General", method: "Efectivo", status: "Confirmado",
      createdBy: "Carmen Rosario", createdAt: "2026-05-07 11:45", authorizedBy: "Carmen Rosario", authorizedAt: "2026-05-07 11:45" },
    { id: 5, date: "2026-05-06", desc: "Compra de instrumentos", member: "—", amount: -42000, type: "Egreso", fund: "General", method: "Cheque", status: "Pendiente",
      createdBy: "Wilkin Almonte", createdAt: "2026-05-06 16:40", authorizedBy: null, authorizedAt: null },
    { id: 6, date: "2026-05-05", desc: "Apoyo a familia Hernández", member: "—", amount: -15000, type: "Egreso", fund: "Beneficencia", method: "Efectivo", status: "Confirmado",
      createdBy: "Carmen Rosario", createdAt: "2026-05-05 09:10", authorizedBy: "Roberto Almonte", authorizedAt: "2026-05-05 12:30" },
    { id: 7, date: "2026-05-05", desc: "Ofrenda misionera", member: "Yokasta Mejía", amount: 4500, type: "Ingreso", fund: "Misiones Haití", method: "Efectivo", status: "Confirmado",
      createdBy: "Wilkin Almonte", createdAt: "2026-05-05 18:05", authorizedBy: "Wilkin Almonte", authorizedAt: "2026-05-05 18:05" },
    { id: 8, date: "2026-05-04", desc: "Diezmo dominical", member: "Elsa Patricia Hernández", amount: 9200, type: "Ingreso", fund: "General", method: "Efectivo", status: "Confirmado",
      createdBy: "Wilkin Almonte", createdAt: "2026-05-04 09:20", authorizedBy: "Wilkin Almonte", authorizedAt: "2026-05-04 09:20" },
    { id: 9, date: "2026-05-04", desc: "Mantenimiento aires acondicionados", member: "—", amount: -6500, type: "Egreso", fund: "General", method: "Efectivo", status: "Pendiente",
      createdBy: "Carmen Rosario", createdAt: "2026-05-04 15:12", authorizedBy: null, authorizedAt: null },
  ],
  attendanceWeeks: [
    { w: "Mar 22", v: 268 }, { w: "Mar 29", v: 282 }, { w: "Abr 5", v: 295 },
    { w: "Abr 12", v: 304 }, { w: "Abr 19", v: 288 }, { w: "Abr 26", v: 318 },
    { w: "May 3", v: 312 },
  ],
  givingMonths: [
    { m: "Nov", v: 380000 }, { m: "Dic", v: 520000 }, { m: "Ene", v: 410000 },
    { m: "Feb", v: 395000 }, { m: "Mar", v: 425000 }, { m: "Abr", v: 458000 },
    { m: "May", v: 285000 },
  ],
  activities: [
    { who: "María Altagracia Peña", what: "registró diezmo", amount: "RD$ 6,800", time: "hace 12 min", kind: "give" },
    { who: "Pastor Roberto", what: "creó evento", amount: "Vigilia de Oración", time: "hace 1 h", kind: "event" },
    { who: "Yokasta Mejía", what: "actualizó perfil", amount: "—", time: "hace 2 h", kind: "edit" },
    { who: "Sistema", what: "exportó reporte", amount: "Finanzas Abril.pdf", time: "hace 3 h", kind: "report" },
    { who: "Wilkin Almonte", what: "registró ingreso", amount: "RD$ 25,000", time: "hace 5 h", kind: "give" },
    { who: "Cristian Ureña", what: "se unió a", amount: "Servicio Jóvenes", time: "ayer", kind: "event" },
  ],
  conversations: [
    { id: 1, name: "Liderazgo Pastoral", lastMsg: "Pastor, confirmamos los detalles del bautizo del sábado.", time: "9:42", unread: 3, group: true, members: 5 },
    { id: 2, name: "Wilkin Almonte", lastMsg: "Listo, ya cuadré las cuentas de Abril.", time: "8:17", unread: 0, role: "Tesorero" },
    { id: 3, name: "Coro de Adoración", lastMsg: "Yokasta: probamos la canción nueva el miércoles?", time: "Ayer", unread: 1, group: true, members: 12 },
    { id: 4, name: "María Altagracia Peña", lastMsg: "Bendiciones pastor, gracias por la oración.", time: "Ayer", unread: 0, role: "Diaconisa" },
    { id: 5, name: "Jóvenes — Encendidos", lastMsg: "José: el flyer ya está listo!", time: "Lun", unread: 0, group: true, members: 28 },
  ],
  messages: [
    { from: "Wilkin Almonte", text: "Bendiciones, Pastor.", time: "8:02", me: false },
    { from: "Wilkin Almonte", text: "Le comparto el resumen del cierre de Abril. Ya validé contra los recibos.", time: "8:04", me: false },
    { from: "me", text: "Mil gracias, hermano. ¿Cuadran los fondos de construcción?", time: "8:09", me: true },
    { from: "Wilkin Almonte", text: "Sí pastor, exacto. Subió 8.1% versus marzo. Todo en regla.", time: "8:14", me: false },
    { from: "Wilkin Almonte", text: "Listo, ya cuadré las cuentas de Abril.", time: "8:17", me: false },
    { from: "me", text: "Excelente trabajo. Que Dios le bendiga.", time: "8:18", me: true },
  ],
  announcements: [
    { tag: "Anuncio Pastoral", title: "Vigilia de Oración por nuestra nación", body: "Este viernes 22 de mayo, 10 PM. Únete en oración por República Dominicana, las familias y nuestros líderes.", date: "8 May 2026", author: "Pastor Roberto" },
    { tag: "Misiones", title: "Ofrenda especial para Haití", body: "Estamos recolectando para nuestros hermanos en Puerto Príncipe. Meta: RD$ 200,000 antes del 30 de mayo.", date: "5 May 2026", author: "Comité de Misiones" },
    { tag: "Jóvenes", title: "Encendidos — Servicio especial", body: "Servicio con banda en vivo, testimonios y palabra. Trae a un amigo. 15 de mayo, 7:30 PM.", date: "3 May 2026", author: "José Manuel Frías" },
  ],

  // ============ Ministerios ============
  ministries: [
    { id: 1, name: "Alabanza y Adoración", leader: "Yokasta Mejía Reynoso", memberIds: [3, 11, 10], description: "Coro, banda y operación de sonido para los cultos.", color: "lila", active: true, createdAt: "2017-03-01" },
    { id: 2, name: "Jóvenes — Encendidos", leader: "José Manuel Frías", memberIds: [2, 12], description: "Ministerio para adolescentes y jóvenes adultos (13–28 años).", color: "green", active: true, createdAt: "2020-08-15" },
    { id: 3, name: "Escuela Dominical", leader: "Carmen Rosario Liriano", memberIds: [7, 9], description: "Formación bíblica para niños y adultos antes del culto.", color: "violet", active: true, createdAt: "2014-01-12" },
    { id: 4, name: "Diaconado", leader: "Francisco Báez Polanco", memberIds: [1, 6], description: "Servicio comunitario, ujieres y atención al recién llegado.", color: "violet", active: true, createdAt: "2014-05-01" },
    { id: 5, name: "Intercesión", leader: "Elsa Patricia Hernández", memberIds: [9, 1], description: "Equipo de oración pre-culto y red de oración intercesora.", color: "lila", active: true, createdAt: "2016-11-03" },
    { id: 6, name: "Misiones — Haití", leader: "Wilkin Almonte Tavárez", memberIds: [4, 6], description: "Apoyo a hermanos de Puerto Príncipe y viajes misioneros.", color: "green", active: true, createdAt: "2019-09-20" },
  ],

  // ============ Usuarios administradores (configuraciones) ============
  adminUsers: [
    { id: 1, email: "pastor@renacer.do", firstName: "Roberto", lastName: "Almonte", role: "Administrador", lastLogin: "Hoy · 8:02 AM", active: true },
    { id: 2, email: "tesoreria@renacer.do", firstName: "Wilkin", lastName: "Almonte", role: "Tesorero", lastLogin: "Hoy · 7:45 AM", active: true },
    { id: 3, email: "secretaria@renacer.do", firstName: "Carmen", lastName: "Rosario", role: "Secretario", lastLogin: "Ayer · 6:30 PM", active: true },
    { id: 4, email: "jovenes@renacer.do", firstName: "José Manuel", lastName: "Frías", role: "Líder", lastLogin: "Hace 2 días", active: true },
    { id: 5, email: "yokasta@renacer.do", firstName: "Yokasta", lastName: "Mejía", role: "Líder", lastLogin: "Hace 5 días", active: false },
  ],

  // ============ Tipos de gasto ============
  expenseTypes: [
    { id: 1, name: "Servicios básicos", description: "Electricidad, agua, internet, teléfono.", active: true },
    { id: 2, name: "Mantenimiento del templo", description: "Pintura, reparaciones menores, jardinería.", active: true },
    { id: 3, name: "Equipos de sonido y audio", description: "Compra y reparación de equipos.", active: true },
    { id: 4, name: "Misiones y ayuda social", description: "Apoyo a misioneros y familias en necesidad.", active: true },
    { id: 5, name: "Materiales para Escuela Dominical", description: "Libros, manualidades, refrigerios.", active: true },
    { id: 6, name: "Eventos especiales", description: "Vigilias, conferencias, retiros.", active: true },
    { id: 7, name: "Combustible y transporte", description: "Diésel para planta, transporte misionero.", active: false },
  ],

  // ============ Tipos de ingreso ============
  incomeTypes: [
    { id: 1, name: "Venta", description: "Venta de libros, artículos, comida, rifas y otros productos.", active: true },
    { id: 2, name: "Evento", description: "Conferencias pagadas, retiros con cuota, conciertos y actividades especiales.", active: true },
    { id: 3, name: "Subvención", description: "Apoyos institucionales, fondos externos y patrocinios.", active: true },
    { id: 4, name: "Transferencia", description: "Ingresos bancarios o transferencias externas sin categoría específica.", active: true },
    { id: 5, name: "Otro ingreso", description: "Cualquier entrada de dinero no clasificada en las categorías anteriores.", active: true },
  ],

  // ============ Catálogo de fondos (extendido con meta/estado) ============
  fundsExtended: [
    { id: 1, name: "Fondo General", description: "Operación diaria de la iglesia: utilidades, salarios, materiales.", balance: 845230.50, goal: 1000000, primary: true, active: true, startDate: "2014-01-01", change: 12.4 },
    { id: 2, name: "Construcción del Templo", description: "Ampliación del santuario principal — Fase 2.", balance: 1284500.00, goal: 2500000, primary: false, active: true, startDate: "2022-04-15", change: 8.1 },
    { id: 3, name: "Misiones — Haití", description: "Apoyo mensual a la iglesia hermana en Puerto Príncipe.", balance: 158420.00, goal: 200000, primary: false, active: true, startDate: "2019-09-01", change: -2.3 },
    { id: 4, name: "Beneficencia Social", description: "Ayudas puntuales a familias y emergencias médicas.", balance: 92750.00, goal: 150000, primary: false, active: true, startDate: "2018-02-10", change: 24.7 },
    { id: 5, name: "Becas Estudiantiles", description: "Apoyo a jóvenes de la congregación con estudios universitarios.", balance: 38400.00, goal: 100000, primary: false, active: false, startDate: "2023-01-20", change: 0 },
  ],

  // ============ Contribuciones individuales (income entries) ============
  contributions: [
    { id: 1, date: "2026-05-08", category: "Diezmo",   contributor: "María Altagracia Peña", fund: "Fondo General",          amount: 6800,  method: "Efectivo",      mode: "Individual" },
    { id: 2, date: "2026-05-08", category: "Ofrenda",  contributor: "Ofrenda colectiva",      fund: "Fondo General",          amount: 18450, method: "Efectivo",      mode: "Colectivo"  },
    { id: 3, date: "2026-05-08", category: "Donación", contributor: "Francisco Báez Polanco", fund: "Construcción del Templo", amount: 25000, method: "Transferencia", mode: "Individual" },
    { id: 4, date: "2026-05-08", category: "Diezmo",   contributor: "Wilkin Almonte Tavárez", fund: "Fondo General",          amount: 12500, method: "Transferencia", mode: "Individual" },
    { id: 5, date: "2026-05-05", category: "Ofrenda",  contributor: "Yokasta Mejía Reynoso",  fund: "Misiones — Haití",       amount: 4500,  method: "Efectivo",      mode: "Individual" },
    { id: 6, date: "2026-05-04", category: "Diezmo",   contributor: "Elsa Patricia Hernández",fund: "Fondo General",          amount: 9200,  method: "Cheque",        mode: "Individual" },
    { id: 7, date: "2026-05-04", category: "Donación", contributor: "Anónimo",                fund: "Beneficencia Social",     amount: 5000,  method: "Efectivo",      mode: "Individual" },
    { id: 8, date: "2026-05-01", category: "Ofrenda",  contributor: "Ofrenda colectiva",      fund: "Fondo General",          amount: 21300, method: "Efectivo",      mode: "Colectivo"  },
    { id: 9, date: "2026-05-01", category: "Diezmo",   contributor: "Mercedes Brito Sosa",    fund: "Fondo General",          amount: 4400,  method: "Tarjeta",       mode: "Individual" },
    { id:10, date: "2026-04-28", category: "Donación", contributor: "Distribuidora Liriano",  fund: "Construcción del Templo", amount: 50000, method: "Transferencia", mode: "Individual" },
  ],

  // ============ Roles disponibles (para usuarios admin y miembros) ============
  roles: [
    { id: 1, name: "Administrador", description: "Acceso total al sistema." },
    { id: 2, name: "Pastor",        description: "Miembros, Eventos, Comunicación." },
    { id: 3, name: "Tesorero",      description: "Finanzas, Reportes." },
    { id: 4, name: "Secretario",    description: "Miembros, Eventos." },
    { id: 5, name: "Líder",         description: "Miembros (lectura), Eventos." },
  ],
};
