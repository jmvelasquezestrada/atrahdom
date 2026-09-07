/* Fuente y parámetros acordados por ATRAHDOM. Montos mensuales en quetzales. */
window.SALARIOS_MINIMOS = {
  2016:{nacional:{agricola:2747.04,noAgricola:2747.04,maquila:2534.15}},2017:{nacional:{agricola:2893.21,noAgricola:2893.21,maquila:2667.52}},2018:{nacional:{agricola:2992.37,noAgricola:2992.37,maquila:2758.16}},2019:{nacional:{agricola:2992.37,noAgricola:2992.37,maquila:2758.16}},2020:{nacional:{agricola:2992.37,noAgricola:3075.10,maquila:2831.77}},2021:{nacional:{agricola:2992.37,noAgricola:3075.10,maquila:2831.77}},2022:{nacional:{agricola:3122.55,noAgricola:3209.24,maquila:2954.35}},
  2023:{ce1:{agricola:3323.60,noAgricola:3416.38,maquila:3143.54},ce2:{agricola:3237.53,noAgricola:3327.56,maquila:3062.63}},2024:{ce1:{agricola:3516.86,noAgricola:3634.59,maquila:3343.01},ce2:{agricola:3374.42,noAgricola:3477.82,maquila:3171.90}},2025:{ce1:{agricola:3843.55,noAgricola:3973.05,maquila:3528.59},ce2:{agricola:3686.86,noAgricola:3680.60,maquila:3347.21}},
  // En 2026 los valores documentados incluyen Q250 de bonificación incentivo.
  2026:{ce1:{agricola:4041.20,noAgricola:4252.28,maquila:3659.73},ce2:{agricola:3875.89,noAgricola:4066.90,maquila:3471.10}}
};
window.obtenerSalarioMinimo = function(year, activity, circumscription){const entry=window.SALARIOS_MINIMOS[year];if(!entry)return null;const region=year<=2022?'nacional':circumscription;const total=entry[region]?.[activity];if(total==null)return null;const bonus=year===2026?250:0;return {monthly:total-bonus,daily:(total-bonus)/30,bonus,total};};
