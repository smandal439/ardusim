/**
 * STM32F746NGH6 Register-Level HAL Plugin for ArduSim
 *
 * Provides real STM32F746 register definitions and transpilation.
 * Users write authentic C code using HAL functions and direct register access.
 * The transpiler rewrites register operations and HAL calls to simulator runtime.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['STM32F746'] = {
  classes: [],
  includes: [],
  priority: 2,

  constants: {
    GPIOA_BASE: 0x40020000,
    GPIOB_BASE: 0x40020400,
    GPIOC_BASE: 0x40020800,
    GPIOD_BASE: 0x40020C00,
    GPIOE_BASE: 0x40021000,
    GPIOF_BASE: 0x40021400,
    GPIOG_BASE: 0x40021800,
    GPIOH_BASE: 0x40021C00,
    GPIOI_BASE: 0x40022000,
    GPIOJ_BASE: 0x40022400,
    GPIOK_BASE: 0x40022800,

    GPIO_MODER:   0x00,
    GPIO_OTYPER:  0x04,
    GPIO_OSPEEDR: 0x08,
    GPIO_PUPDR:   0x0C,
    GPIO_IDR:     0x10,
    GPIO_ODR:     0x14,
    GPIO_BSRR:    0x18,
    GPIO_LCKR:    0x1C,
    GPIO_AFRL:    0x20,
    GPIO_AFRH:    0x24,

    GPIOA_MODER:   0x40020000,
    GPIOA_OTYPER:  0x40020004,
    GPIOA_OSPEEDR: 0x40020008,
    GPIOA_PUPDR:   0x4002000C,
    GPIOA_IDR:     0x40020010,
    GPIOA_ODR:     0x40020014,
    GPIOA_BSRR:    0x40020018,

    GPIOB_MODER:   0x40020400,
    GPIOB_OTYPER:  0x40020404,
    GPIOB_OSPEEDR: 0x40020408,
    GPIOB_PUPDR:   0x4002040C,
    GPIOB_IDR:     0x40020410,
    GPIOB_ODR:     0x40020414,
    GPIOB_BSRR:    0x40020418,

    GPIOC_MODER:   0x40020800,
    GPIOC_OTYPER:  0x40020804,
    GPIOC_OSPEEDR: 0x40020808,
    GPIOC_PUPDR:   0x4002080C,
    GPIOC_IDR:     0x40020810,
    GPIOC_ODR:     0x40020814,
    GPIOC_BSRR:    0x40020818,

    GPIOD_MODER:   0x40020C00,
    GPIOD_OTYPER:  0x40020C04,
    GPIOD_OSPEEDR: 0x40020C08,
    GPIOD_PUPDR:   0x40020C0C,
    GPIOD_IDR:     0x40020C10,
    GPIOD_ODR:     0x40020C14,
    GPIOD_BSRR:    0x40020C18,

    GPIOE_MODER:   0x40021000,
    GPIOE_OTYPER:  0x40021004,
    GPIOE_OSPEEDR: 0x40021008,
    GPIOE_PUPDR:   0x4002100C,
    GPIOE_IDR:     0x40021010,
    GPIOE_ODR:     0x40021014,
    GPIOE_BSRR:    0x40021018,

    GPIOF_MODER:   0x40021400,
    GPIOF_OTYPER:  0x40021404,
    GPIOF_OSPEEDR: 0x40021408,
    GPIOF_PUPDR:   0x4002140C,
    GPIOF_IDR:     0x40021410,
    GPIOF_ODR:     0x40021414,
    GPIOF_BSRR:    0x40021418,

    GPIOG_MODER:   0x40021800,
    GPIOG_OTYPER:  0x40021804,
    GPIOG_OSPEEDR: 0x40021808,
    GPIOG_PUPDR:   0x4002180C,
    GPIOG_IDR:     0x40021810,
    GPIOG_ODR:     0x40021814,
    GPIOG_BSRR:    0x40021818,

    GPIOH_MODER:   0x40021C00,
    GPIOH_OTYPER:  0x40021C04,
    GPIOH_OSPEEDR: 0x40021C08,
    GPIOH_PUPDR:   0x40021C0C,
    GPIOH_IDR:     0x40021C10,
    GPIOH_ODR:     0x40021C14,
    GPIOH_BSRR:    0x40021C18,

    GPIOI_MODER:   0x40022000,
    GPIOI_OTYPER:  0x40022004,
    GPIOI_OSPEEDR: 0x40022008,
    GPIOI_PUPDR:   0x4002200C,
    GPIOI_IDR:     0x40022010,
    GPIOI_ODR:     0x40022014,
    GPIOI_BSRR:    0x40022018,

    GPIOJ_MODER:   0x40022400,
    GPIOJ_OTYPER:  0x40022404,
    GPIOJ_OSPEEDR: 0x40022408,
    GPIOJ_PUPDR:   0x4002240C,
    GPIOJ_IDR:     0x40022410,
    GPIOJ_ODR:     0x40022414,
    GPIOJ_BSRR:    0x40022418,

    GPIOK_MODER:   0x40022800,
    GPIOK_OTYPER:  0x40022804,
    GPIOK_OSPEEDR: 0x40022808,
    GPIOK_PUPDR:   0x4002280C,
    GPIOK_IDR:     0x40022810,
    GPIOK_ODR:     0x40022814,
    GPIOK_BSRR:    0x40022818,

    RCC_BASE:     0x40023800,
    GPIOA: 0x40020000, GPIOB: 0x40020400, GPIOC: 0x40020800,
    GPIOD: 0x40020C00, GPIOE: 0x40021000, GPIOF: 0x40021400,
    GPIOG: 0x40021800, GPIOH: 0x40021C00, GPIOI: 0x40022000,
    GPIOJ: 0x40022400, GPIOK: 0x40022800,

    RCC_CR:    0x40023800,
    RCC_PLLCFGR:  0x40023804,
    RCC_CFGR:     0x40023808,
    RCC_CIR:      0x4002380C,
    RCC_AHB1RSTR: 0x40023810,
    RCC_AHB2RSTR: 0x40023814,
    RCC_AHB3RSTR: 0x40023818,
    RCC_APB1RSTR: 0x40023820,
    RCC_APB2RSTR: 0x40023824,
    RCC_AHB1ENR:  0x40023830,
    RCC_AHB2ENR:  0x40023834,
    RCC_AHB3ENR:  0x40023838,
    RCC_APB1ENR:  0x40023840,
    RCC_APB2ENR:  0x40023844,
    RCC_AHB1LPENR: 0x40023850,
    RCC_APB1LPENR: 0x40023858,
    RCC_APB2LPENR: 0x4002385C,
    RCC_BDCR:     0x40023870,
    RCC_CSR:      0x40023874,
    RCC_SSCGR:    0x40023880,
    RCC_PLLI2SCFGR: 0x40023884,

    USART1_BASE:  0x40011000,
    USART2_BASE:  0x40004400,
    USART3_BASE:  0x40004800,
    UART4_BASE:   0x40004C00,
    UART5_BASE:   0x40005000,
    USART6_BASE:  0x40011400,

    USART_SR:   0x00,
    USART_DR:   0x04,
    USART_BRR:  0x08,
    USART_CR1:  0x0C,
    USART_CR2:  0x10,
    USART_CR3:  0x14,

    USART1_SR:  0x40011000,
    USART1_DR:  0x40011004,
    USART1_BRR: 0x40011008,
    USART1_CR1: 0x4001100C,
    USART2_SR:  0x40004400,
    USART2_DR:  0x40004404,
    USART2_BRR: 0x40004408,
    USART2_CR1: 0x4000440C,
    USART3_SR:  0x40004800,
    USART3_DR:  0x40004804,
    USART3_BRR: 0x40004808,
    USART3_CR1: 0x4000480C,
    UART4_SR:   0x40004C00,
    UART4_DR:   0x40004C04,
    UART4_BRR:  0x40004C08,
    UART4_CR1:  0x40004C0C,
    UART5_SR:   0x40005000,
    UART5_DR:   0x40005004,
    UART5_BRR:  0x40005008,
    UART5_CR1:  0x4000500C,
    USART6_SR:  0x40011400,
    USART6_DR:  0x40011404,
    USART6_BRR: 0x40011408,
    USART6_CR1: 0x4001140C,

    ADC1_BASE:   0x40012000,
    ADC2_BASE:   0x40012400,
    ADC3_BASE:   0x40012800,
    ADC_SR:      0x00,
    ADC_CR1:     0x04,
    ADC_CR2:     0x08,
    ADC_SMPR1:   0x0C,
    ADC_SMPR2:   0x10,
    ADC_JOFR1:   0x14,
    ADC_JOFR2:   0x18,
    ADC_JOFR3:   0x1C,
    ADC_JOFR4:   0x20,
    ADC_HTR:     0x24,
    ADC_LTR:     0x28,
    ADC_SQR1:    0x2C,
    ADC_SQR2:    0x30,
    ADC_SQR3:    0x34,
    ADC_JSQR:    0x38,
    ADC_JDR1:    0x3C,
    ADC_JDR2:    0x40,
    ADC_JDR3:    0x44,
    ADC_JDR4:    0x48,
    ADC_DR:      0x4C,
    ADC_CCR:     0x40012300,

    TIM1_BASE:   0x40010000,
    TIM2_BASE:   0x40000000,
    TIM3_BASE:   0x40000400,
    TIM4_BASE:   0x40000800,
    TIM5_BASE:   0x40000C00,
    TIM6_BASE:   0x40001000,
    TIM7_BASE:   0x40001400,
    TIM8_BASE:   0x40010400,
    TIM9_BASE:   0x40014000,
    TIM10_BASE:  0x40014400,
    TIM11_BASE:  0x40014800,
    TIM12_BASE:  0x40018000,
    TIM13_BASE:  0x40018400,
    TIM14_BASE:  0x40018800,

    TIM_CR1:   0x00,
    TIM_CR2:   0x04,
    TIM_SMCR:  0x08,
    TIM_DIER:  0x0C,
    TIM_SR:    0x10,
    TIM_EGR:   0x14,
    TIM_CCMR1: 0x18,
    TIM_CCMR2: 0x1C,
    TIM_CCER:  0x20,
    TIM_CNT:   0x24,
    TIM_PSC:   0x28,
    TIM_ARR:   0x2C,
    TIM_RCR:   0x30,
    TIM_CCR1:  0x34,
    TIM_CCR2:  0x38,
    TIM_CCR3:  0x3C,
    TIM_CCR4:  0x40,
    TIM_BDTR:  0x44,
    TIM_DCR:   0x48,

    SPI1_BASE:  0x40013000,
    SPI2_BASE:  0x40003800,
    SPI3_BASE:  0x40003C00,
    SPI4_BASE:  0x40013400,
    SPI_CR1:    0x00,
    SPI_CR2:    0x04,
    SPI_SR:     0x08,
    SPI_DR:     0x0C,
    SPI_CRCPR:  0x10,
    SPI_RXCRCR: 0x14,
    SPI_TXCRCR: 0x18,

    I2C1_BASE:  0x40005400,
    I2C2_BASE:  0x40005800,
    I2C3_BASE:  0x40005C00,
    I2C_CR1:    0x00,
    I2C_CR2:    0x04,
    I2C_OAR1:   0x08,
    I2C_OAR2:   0x0C,
    I2C_DR:     0x10,
    I2C_SR1:    0x14,
    I2C_SR2:    0x18,
    I2C_CCR:    0x1C,
    I2C_TRISE:  0x20,

    SYSTICK_BASE: 0xE000E010,
    SysTick_CSR:  0xE000E010,
    SysTick_RVR:  0xE000E014,
    SysTick_CVR:  0xE000E018,

    RCC_AHB1ENR_GPIOAEN: (1 << 0),
    RCC_AHB1ENR_GPIOBEN: (1 << 1),
    RCC_AHB1ENR_GPIOCEN: (1 << 2),
    RCC_AHB1ENR_GPIODEN: (1 << 3),
    RCC_AHB1ENR_GPIOEEN: (1 << 4),
    RCC_AHB1ENR_GPIOFEN: (1 << 5),
    RCC_AHB1ENR_GPIOGEN: (1 << 6),
    RCC_AHB1ENR_GPIOHEN: (1 << 7),
    RCC_AHB1ENR_GPIOIEN: (1 << 8),
    RCC_AHB1ENR_GPIOJEN: (1 << 9),
    RCC_AHB1ENR_GPIOKEN: (1 << 10),

    RCC_APB1ENR_TIM2EN:   (1 << 0),
    RCC_APB1ENR_TIM3EN:   (1 << 1),
    RCC_APB1ENR_TIM4EN:   (1 << 2),
    RCC_APB1ENR_TIM5EN:   (1 << 3),
    RCC_APB1ENR_TIM6EN:   (1 << 4),
    RCC_APB1ENR_TIM7EN:   (1 << 5),
    RCC_APB1ENR_TIM12EN:  (1 << 6),
    RCC_APB1ENR_TIM13EN:  (1 << 7),
    RCC_APB1ENR_TIM14EN:  (1 << 8),
    RCC_APB1ENR_USART2EN: (1 << 17),
    RCC_APB1ENR_USART3EN: (1 << 18),
    RCC_APB1ENR_UART4EN:  (1 << 19),
    RCC_APB1ENR_UART5EN:  (1 << 20),
    RCC_APB1ENR_I2C1EN:   (1 << 21),
    RCC_APB1ENR_I2C2EN:   (1 << 22),
    RCC_APB1ENR_I2C3EN:   (1 << 23),
    RCC_APB1ENR_PWREN:    (1 << 28),

    RCC_APB2ENR_TIM1EN:   (1 << 0),
    RCC_APB2ENR_TIM8EN:   (1 << 1),
    RCC_APB2ENR_USART1EN: (1 << 4),
    RCC_APB2ENR_USART6EN: (1 << 5),
    RCC_APB2ENR_ADC1EN:   (1 << 8),
    RCC_APB2ENR_ADC2EN:   (1 << 9),
    RCC_APB2ENR_ADC3EN:   (1 << 10),
    RCC_APB2ENR_SPI1EN:   (1 << 12),
    RCC_APB2ENR_SPI4EN:   (1 << 13),
    RCC_APB2ENR_TIM9EN:   (1 << 16),
    RCC_APB2ENR_TIM10EN:  (1 << 17),
    RCC_APB2ENR_TIM11EN:  (1 << 18),

    RCC_AHB1ENR_DMA1EN:   (1 << 21),
    RCC_AHB1ENR_DMA2EN:   (1 << 22),

    GPIO_PIN_0:  (1 << 0),
    GPIO_PIN_1:  (1 << 1),
    GPIO_PIN_2:  (1 << 2),
    GPIO_PIN_3:  (1 << 3),
    GPIO_PIN_4:  (1 << 4),
    GPIO_PIN_5:  (1 << 5),
    GPIO_PIN_6:  (1 << 6),
    GPIO_PIN_7:  (1 << 7),
    GPIO_PIN_8:  (1 << 8),
    GPIO_PIN_9:  (1 << 9),
    GPIO_PIN_10: (1 << 10),
    GPIO_PIN_11: (1 << 11),
    GPIO_PIN_12: (1 << 12),
    GPIO_PIN_13: (1 << 13),
    GPIO_PIN_14: (1 << 14),
    GPIO_PIN_15: (1 << 15),

    GPIO_MODE_INPUT:   0x00,
    GPIO_MODE_OUTPUT:  0x01,
    GPIO_MODE_AF:      0x02,
    GPIO_MODE_ANALOG:  0x03,

    GPIO_NOPULL:   0x00,
    GPIO_PULLUP:   0x01,
    GPIO_PULLDOWN: 0x02,

    GPIO_SPEED_LOW:     0x00,
    GPIO_SPEED_MEDIUM:  0x01,
    GPIO_SPEED_HIGH:    0x02,
    GPIO_SPEED_VERY_HIGH: 0x03,

    GPIO_PIN_RESET: 0,
    GPIO_PIN_SET:   1,

    USART_CR1_UE:   (1 << 13),
    USART_CR1_TE:   (1 << 3),
    USART_CR1_RE:   (1 << 2),
    USART_SR_TXE:   (1 << 7),
    USART_SR_TC:    (1 << 6),
    USART_SR_RXNE:  (1 << 5),

    ADC_CR2_ADON:   (1 << 0),
    ADC_CR2_SWSTART: (1 << 30),
    ADC_SR_EOC:     (1 << 1),
    ADC_SR_STRT:    (1 << 4),

    TIM_CR1_CEN:    (1 << 0),
    TIM_CR1_ARPE:   (1 << 7),
    TIM_DIER_UIE:   (1 << 0),
    TIM_SR_UIF:     (1 << 0),
    TIM_EGR_UG:     (1 << 0),

    SPI_CR1_SPE:    (1 << 6),
    SPI_SR_TXE:     (1 << 1),
    SPI_SR_RXNE:    (1 << 0),
    SPI_SR_BSY:     (1 << 7),

    I2C_CR1_PE:     (1 << 0),
    I2C_SR1_TXE:    (1 << 7),
    I2C_SR1_RXNE:   (1 << 6),
    I2C_SR1_BTF:    (1 << 2),
    I2C_SR1_SB:     (1 << 0),
    I2C_SR2_BUSY:   (1 << 1),
  },

  transpile: (function () {
    var GPIO_BASES = {
      GPIOA: 0x40020000, GPIOB: 0x40020400, GPIOC: 0x40020800,
      GPIOD: 0x40020C00, GPIOE: 0x40021000, GPIOF: 0x40021400,
      GPIOG: 0x40021800, GPIOH: 0x40021C00, GPIOI: 0x40022000,
      GPIOJ: 0x40022400, GPIOK: 0x40022800,
    };

    var GPIO_REGS = {
      MODER: 0x00, OTYPER: 0x04, OSPEEDR: 0x08, PUPDR: 0x0C,
      IDR: 0x10, ODR: 0x14, BSRR: 0x18, LCKR: 0x1C, AFRL: 0x20, AFRH: 0x24,
    };

    var PERIPH_BASES = {
      GPIOA: 0x40020000, GPIOB: 0x40020400, GPIOC: 0x40020800,
      GPIOD: 0x40020C00, GPIOE: 0x40021000, GPIOF: 0x40021400,
      GPIOG: 0x40021800, GPIOH: 0x40021C00, GPIOI: 0x40022000,
      GPIOJ: 0x40022400, GPIOK: 0x40022800,
      RCC: 0x40023800, FLASH_R: 0x40023C00,
      USART1: 0x40011000, USART2: 0x40004400, USART3: 0x40004800,
      UART4: 0x40004C00, UART5: 0x40005000, USART6: 0x40011400,
      ADC1: 0x40012000, ADC2: 0x40012400, ADC3: 0x40012800,
      TIM1: 0x40010000, TIM2: 0x40000000, TIM3: 0x40000400,
      TIM4: 0x40000800, TIM5: 0x40000C00, TIM6: 0x40001000,
      TIM7: 0x40001400, TIM8: 0x40010400, TIM9: 0x40014000,
      TIM10: 0x40014400, TIM11: 0x40014800, TIM12: 0x40001800,
      TIM13: 0x40001C00, TIM14: 0x40002000,
      SPI1: 0x40013000, SPI2: 0x40003800, SPI3: 0x40003C00, SPI4: 0x40013400,
      I2C1: 0x40005400, I2C2: 0x40005800, I2C3: 0x40005C00,
      SYSTICK: 0xE000E010,
    };

    var GPIO_REGS = {
      MODER: 0x00, OTYPER: 0x04, OSPEEDR: 0x08, PUPDR: 0x0C,
      IDR: 0x10, ODR: 0x14, BSRR: 0x18, LCKR: 0x1C, AFRL: 0x20, AFRH: 0x24,
    };

    var RCC_REGS = {
      CR: 0x00, PLLCFGR: 0x04, CFGR: 0x08, CIR: 0x0C,
      AHB1RSTR: 0x10, AHB2RSTR: 0x14, AHB3RSTR: 0x18,
      APB1RSTR: 0x20, APB2RSTR: 0x24,
      AHB1ENR: 0x30, AHB2ENR: 0x34, AHB3ENR: 0x38,
      APB1ENR: 0x40, APB2ENR: 0x44,
      AHB1LPENR: 0x50, APB1LPENR: 0x58, APB2LPENR: 0x5C,
      BDCR: 0x70, CSR: 0x74, SSCGR: 0x80, PLLI2SCFGR: 0x84,
    };

    var USART_REGS = {
      SR: 0x00, DR: 0x04, BRR: 0x08, CR1: 0x0C, CR2: 0x10, CR3: 0x14, GTPR: 0x18,
    };

    var ADC_REGS = {
      SR: 0x00, CR1: 0x04, CR2: 0x08,
      SMPR1: 0x0C, SMPR2: 0x10,
      JOFR1: 0x14, JOFR2: 0x18, JOFR3: 0x1C, JOFR4: 0x20,
      HTR: 0x24, LTR: 0x28,
      SQR1: 0x2C, SQR2: 0x30, SQR3: 0x34, JSQR: 0x38,
      JDR1: 0x3C, JDR2: 0x40, JDR3: 0x44, JDR4: 0x48,
      DR: 0x4C, CCR: 0x300,
    };

    var TIM_REGS = {
      CR1: 0x00, CR2: 0x04, SMCR: 0x08, DIER: 0x0C, SR: 0x10, EGR: 0x14,
      CCMR1: 0x18, CCMR2: 0x1C, CCER: 0x20, CNT: 0x24, PSC: 0x28, ARR: 0x2C,
      RCR: 0x30, CCR1: 0x34, CCR2: 0x38, CCR3: 0x3C, CCR4: 0x40, BDTR: 0x44, DCR: 0x48,
    };

    var SPI_REGS = {
      CR1: 0x00, CR2: 0x04, SR: 0x08, DR: 0x0C, CRCPR: 0x10, RXCRCR: 0x14, TXCRCR: 0x18,
    };

    var I2C_REGS = {
      CR1: 0x00, CR2: 0x04, OAR1: 0x08, OAR2: 0x0C, DR: 0x10,
      SR1: 0x14, SR2: 0x18, CCR: 0x1C, TRISE: 0x20,
    };

    var SYSTICK_REGS = {
      CTRL: 0x00, LOAD: 0x04, VAL: 0x08, CALIB: 0x0C,
    };

    var PERIPH_TYPE = {};
    Object.keys(GPIO_BASES).forEach(function (n) { PERIPH_TYPE[n] = 'GPIO'; });
    PERIPH_TYPE.RCC = 'RCC';
    PERIPH_TYPE.FLASH_R = 'FLASH';
    Object.keys(PERIPH_BASES).forEach(function (n) {
      if (n.match(/^USART|^UART/)) PERIPH_TYPE[n] = 'USART';
      if (n.match(/^ADC/)) PERIPH_TYPE[n] = 'ADC';
      if (n.match(/^TIM/)) PERIPH_TYPE[n] = 'TIM';
      if (n.match(/^SPI/)) PERIPH_TYPE[n] = 'SPI';
      if (n.match(/^I2C/)) PERIPH_TYPE[n] = 'I2C';
      if (n === 'SYSTICK') PERIPH_TYPE[n] = 'SYSTICK';
    });

    var PERIPH_REGS = {
      GPIO: GPIO_REGS,
      RCC: RCC_REGS,
      USART: USART_REGS,
      ADC: ADC_REGS,
      TIM: TIM_REGS,
      SPI: SPI_REGS,
      I2C: I2C_REGS,
      SYSTICK: SYSTICK_REGS,
    };

    var PF_ADDR = {};
    var allFieldNames = {};
    Object.keys(PERIPH_BASES).forEach(function (pName) {
      var type = PERIPH_TYPE[pName];
      var regs = PERIPH_REGS[type];
      if (!regs) return;
      var base = PERIPH_BASES[pName];
      Object.keys(regs).forEach(function (fName) {
        PF_ADDR[pName + '->' + fName] = (base + regs[fName]) >>> 0;
        allFieldNames[fName] = true;
      });
    });

    var periphNames = Object.keys(PERIPH_BASES).sort(function (a, b) { return b.length - a.length; });
    var fieldNames = Object.keys(allFieldNames).sort(function (a, b) { return b.length - a.length; });
    var periphPat = '(' + periphNames.join('|') + ')';
    var fieldPat = '(' + fieldNames.join('|') + ')';
    var periphFieldPat = periphPat + '->' + fieldPat;

    function _pfx(periph, field) {
      var key = periph + '->' + field;
      var addr = PF_ADDR[key];
      if (addr === undefined) return '0x0';
      return '0x' + addr.toString(16);
    }

    var rules = [];

    rules.push([/\bdelay_ms\s*\(/g, 'await delay(']);
    rules.push([/\bdelay_us\s*\(/g, 'await delayMicroseconds(']);

    rules.push([/\bHAL_GPIO_WritePin\s*\(/g, '_hal_gpioWrite(']);
    rules.push([/\bHAL_GPIO_ReadPin\s*\(/g, '_hal_gpioRead(']);
    rules.push([/\bHAL_GPIO_TogglePin\s*\(/g, '_hal_gpioToggle(']);
    rules.push([/\bHAL_GPIO_Init\s*\(/g, '_hal_gpioInit(']);
    rules.push([/\bHAL_Delay\s*\(/g, 'await _hal_delay(']);
    rules.push([/\bHAL_Init\s*\(/g, '_hal_init(']);
    rules.push([/\bSystemClock_Config\s*\(/g, '_hal_systemClockConfig(']);
    rules.push([/\b__HAL_RCC_GPIO[A-K]_CLK_ENABLE\s*\(\)/g, '_clkEnable()']);
    rules.push([/\bHAL_ADC_Start\s*\(/g, '_hal_adcStart(']);
    rules.push([/\bHAL_ADC_GetValue\s*\(/g, '_hal_adcGetValue(']);
    rules.push([/\bHAL_ADC_PollForConversion\s*\(/g, '_hal_adcPollForConversion(']);
    rules.push([/\bHAL_UART_Transmit\s*\(/g, '_hal_uartTransmit(']);
    rules.push([/\bError_Handler\s*\(/g, '_errorHandler(']);
    rules.push([/\b__enable_irq\s*\(\)/g, '_noop()']);
    rules.push([/\b__disable_irq\s*\(\)/g, '_noop()']);
    rules.push([/\b__NOP\s*\(\)/g, '_noop()']);
    rules.push([/\b__WFI\s*\(\)/g, '_noop()']);

    rules.push([/\bHAL_GetTick\s*\(/g, '_hal_getTick(']);
    rules.push([/\bHAL_IncTick\s*\(\)/g, '_hal_incTick()']);

    rules.push([new RegExp(periphFieldPat + '\\s*\\|=\\s*([^;/]+)', 'g'),
     function (m, p, f, v) { return '_regW(' + _pfx(p,f) + ', _regR(' + _pfx(p,f) + ') | (' + v.trim() + '))'; }]);
    rules.push([new RegExp(periphFieldPat + '\\s*&=\\s*~\\s*\\(([^)]+)\\)', 'g'),
     function (m, p, f, v) { return '_regW(' + _pfx(p,f) + ', _regR(' + _pfx(p,f) + ') & ~(' + v + '))'; }]);
    rules.push([new RegExp(periphFieldPat + '\\s*&=\\s*~\\s*(\\S+)', 'g'),
     function (m, p, f, v) { return '_regW(' + _pfx(p,f) + ', _regR(' + _pfx(p,f) + ') & ~(' + v + '))'; }]);
    rules.push([new RegExp(periphFieldPat + '\\s*&=\\s*([^;/]+)', 'g'),
     function (m, p, f, v) { return '_regW(' + _pfx(p,f) + ', _regR(' + _pfx(p,f) + ') & (' + v.trim() + '))'; }]);
    rules.push([new RegExp(periphFieldPat + '\\s*\\^=\\s*([^;/]+)', 'g'),
     function (m, p, f, v) { return '_regW(' + _pfx(p,f) + ', _regR(' + _pfx(p,f) + ') ^ (' + v.trim() + '))'; }]);
    rules.push([new RegExp(periphFieldPat + '\\s*<<=\\s*([^;/]+)', 'g'),
     function (m, p, f, v) { return '_regW(' + _pfx(p,f) + ', _regR(' + _pfx(p,f) + ') << (' + v.trim() + '))'; }]);
    rules.push([new RegExp(periphFieldPat + '\\s*>>=\\s*([^;/]+)', 'g'),
     function (m, p, f, v) { return '_regW(' + _pfx(p,f) + ', _regR(' + _pfx(p,f) + ') >> (' + v.trim() + '))'; }]);

    rules.push([new RegExp(periphFieldPat + '\\s*=\\s*([^;/]+)', 'g'),
     function (m, p, f, v) { return '_regW(' + _pfx(p,f) + ', (' + v.trim() + '))'; }]);

    rules.push([new RegExp('(?<!_reg[WR]\\()' + periphFieldPat, 'g'),
     function (m, p, f) { return '_regR(' + _pfx(p,f) + ')'; }]);

    // Busy-wait yield injection — MUST run AFTER periph-field → _regR conversion
    // so the patterns below can match the generated _regR(addr) calls.
    // Without a yield, these tight while loops freeze the browser main thread.

    // UART SR (TXE=0x80, RXNE=0x20) — USART1/2/3, UART4/5, USART6
    rules.push([/while\s*\(\s*!\s*\(\s*_regR\s*\(\s*(0x40011000|0x40004400|0x40004800|0x40004C00|0x40005000|0x40011400)\s*\)\s*&\s*(0x[0-9A-Fa-f]+|USART_SR_\w+|ADC_SR_\w+)\s*\)\s*\)\s*;/g,
      function(m, addr, mask) {
        return 'while (!(_regR(' + addr + ') & ' + mask + ')) { await new Promise(r => setTimeout(r, 0)); }';
      }]);

    // ADC SR (EOC=0x02) — ADC1/2/3
    rules.push([/while\s*\(\s*!\s*\(\s*_regR\s*\(\s*(0x40012000|0x40012400|0x40012800)\s*\)\s*&\s*(0x[0-9A-Fa-f]+|ADC_SR_\w+)\s*\)\s*\)\s*;/g,
      function(m, addr, mask) {
        return 'while (!(_regR(' + addr + ') & ' + mask + ')) { await new Promise(r => setTimeout(r, 0)); }';
      }]);

    // SPI SR (TXE=0x02, RXNE=0x01, BSY=0x80)
    rules.push([/while\s*\(\s*!\s*\(\s*_regR\s*\(\s*(0x40013008|0x40003808|0x40003C08|0x40013408)\s*\)\s*&\s*(0x[0-9A-Fa-f]+|SPI_SR_\w+)\s*\)\s*\)\s*;/g,
      function(m, addr, mask) {
        return 'while (!(_regR(' + addr + ') & ' + mask + ')) { await new Promise(r => setTimeout(r, 0)); }';
      }]);

    // I2C SR1 (TXE=0x80, RXNE=0x40, SB=0x01, BTF=0x04)
    rules.push([/while\s*\(\s*!\s*\(\s*_regR\s*\(\s*(0x40005414|0x40005814|0x40005C14)\s*\)\s*&\s*(0x[0-9A-Fa-f]+|I2C_SR\w*)\s*\)\s*\)\s*;/g,
      function(m, addr, mask) {
        return 'while (!(_regR(' + addr + ') & ' + mask + ')) { await new Promise(r => setTimeout(r, 0)); }';
      }]);

    // Generic safety net: any remaining empty-body busy-wait on _regR gets a yield
    rules.push([/while\s*\(\s*!\s*\(\s*_regR\s*\(\s*(0x[0-9A-Fa-f]+)\s*\)\s*&\s*([^)]+)\)\s*\)\s*;/g,
      function(m, addr, mask) {
        return 'while (!(_regR(' + addr + ') & ' + mask + ')) { await new Promise(r => setTimeout(r, 0)); }';
      }]);

    rules.push([/\*\s*\(\s*\(\s*volatile\s+(?:unsigned\s+)?(?:long|int|short|char)\s*\*\s*\)\s*(0x[0-9A-Fa-f]+)\s*\)\s*=\s*([^;]+)/g,
     '_regW($1, ($2))']);
    rules.push([/\*\s*\(\s*\(\s*volatile\s+(?:unsigned\s+)?(?:long|int|short|char)\s*\*\s*\)\s*(0x[0-9A-Fa-f]+)\s*\)/g,
     '_regR($1)']);

    return rules;
  })(),

  runtime: function (self) {
    var regs = {};

    var GPIO_OFFSETS = {
      MODER: 0x00, OTYPER: 0x04, OSPEEDR: 0x08, PUPDR: 0x0C,
      IDR: 0x10, ODR: 0x14, BSRR: 0x18, LCKR: 0x1C, AFRL: 0x20, AFRH: 0x24,
    };

    var GPIO_BASES = {
      A: 0x40020000, B: 0x40020400, C: 0x40020800,
      D: 0x40020C00, E: 0x40021000, F: 0x40021400,
      G: 0x40021800, H: 0x40021C00, I: 0x40022000,
      J: 0x40022400, K: 0x40022800,
    };

    var GPIO_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

    var PORT_PIN_MAP = {
      'I_1': 'pin_13',
      'D_12': 'pin_3', 'D_13': 'pin_4',
      'D_14': 'pin_5', 'D_15': 'pin_6',
      'C_6': 'pin_1', 'C_7': 'pin_0',
      'G_6': 'pin_2',
      'G_11': 'pin_7', 'G_12': 'pin_8',
      'B_8': 'pin_9', 'B_10': 'pin_10',
      'E_5': 'pin_11', 'E_6': 'pin_12',
      'B_7': 'pin_15',
      'A_0': 'pin_14', 'A_4': 'pin_15', 'A_5': 'pin_16',
      'A_6': 'pin_17', 'A_7': 'pin_18',
      'C_4': 'pin_19',
    };

    var ADC_PIN_MAP = {
      'A_0': 0,
      'A_1': 1, 'A_2': 2, 'A_3': 3, 'A_4': 4, 'A_5': 5, 'A_6': 6, 'A_7': 7,
      'B_0': 8, 'B_1': 9,
      'C_0': 10, 'C_1': 11, 'C_2': 12, 'C_3': 13, 'C_4': 14, 'C_5': 15,
    };

    var ADC_BASES = {
      0x40012000: 1,
      0x40012400: 2,
      0x40012800: 3,
    };

    var ADC_CR2_ADON = (1 << 0);
    var ADC_CR2_SWSTART = (1 << 30);
    var ADC_SR_EOC = (1 << 1);
    var ADC_SR_STRT = (1 << 4);

    var REVERSE_PORT_PIN = {};
    Object.keys(PORT_PIN_MAP).forEach(function (key) {
      REVERSE_PORT_PIN[PORT_PIN_MAP[key]] = key;
    });

    Object.keys(GPIO_BASES).forEach(function (letter) {
      var base = GPIO_BASES[letter];
      regs[base + 0x00] = 0;
      regs[base + 0x04] = 0;
      regs[base + 0x08] = 0;
      regs[base + 0x0C] = 0;
      regs[base + 0x10] = 0;
      regs[base + 0x14] = 0;
      regs[base + 0x18] = 0;
      regs[base + 0x1C] = 0;
      regs[base + 0x20] = 0;
      regs[base + 0x24] = 0;
    });

    regs[0x40023830] = 0;
    regs[0x40023840] = 0;
    regs[0x40023844] = 0;

    var UART_BASES = {
      0x40011000: 'USART1', 0x40004400: 'USART2', 0x40004800: 'USART3',
      0x40004C00: 'UART4', 0x40005000: 'UART5', 0x40011400: 'USART6',
    };

    var UART_RX_FIFOS = {};
    Object.keys(UART_BASES).forEach(function (addr) {
      UART_RX_FIFOS[addr] = [];
    });

    self._stm32_tick = 0;

    function _getPortLetter(addr) {
      var base = addr & 0xFFFFFC00;
      for (var i = 0; i < GPIO_LETTERS.length; i++) {
        var letter = GPIO_LETTERS[i];
        if (GPIO_BASES[letter] === base) return letter;
      }
      return null;
    }

    function _getOffset(addr) {
      return addr & 0xFF;
    }

    function _syncInputFromSimulator(portLetter, bit) {
      var key = portLetter + '_' + bit;
      var pinName = PORT_PIN_MAP[key];
      if (!pinName) return 0;

      var pinState = self.pinStates[pinName];
      if ((!pinState || pinState <= 0) && window.ArduinoSim && window.ArduinoSim.pinStates) {
        var simState = window.ArduinoSim.pinStates[pinName];
        if (simState && simState > 0) pinState = simState;
      }
      return (pinState && pinState > 0) ? 1 : 0;
    }

    function _uartHandler(baseAddr, byte) {
      if (self._serialLog) self._serialLog(String.fromCharCode(byte));
    }

    function _readReg(addr) {
      if (regs[addr] === undefined) regs[addr] = 0;

      var portLetter = _getPortLetter(addr);
      var offset = _getOffset(addr);

      if (portLetter && offset === 0x10) {
        var val = regs[addr] & 0xFFFF0000;
        for (var bit = 0; bit < 16; bit++) {
          if (_syncInputFromSimulator(portLetter, bit)) {
            val |= (1 << bit);
          }
        }
        regs[addr] = val;
      }

      if (UART_BASES[addr]) {
        var offset = _getOffset(addr);
        if (offset === 0x00) {
          queueMicrotask(function() {});
        }
        return regs[addr] | 0x00C0;
      }

      var uartDrAddrs = [0x40011004, 0x40004404, 0x40004804, 0x40004C04, 0x40005004, 0x40011404];
      for (var u = 0; u < uartDrAddrs.length; u++) {
        if (addr === uartDrAddrs[u]) {
          var baseAddr = uartDrAddrs[u] - 0x04;
          var fifo = UART_RX_FIFOS[baseAddr];
          if (fifo && fifo.length > 0) return fifo.shift();
          return 0;
        }
      }

      var adcDrAddrs = [0x4001204C, 0x4001244C, 0x4001284C];
      for (var a = 0; a < adcDrAddrs.length; a++) {
        if (addr === adcDrAddrs[a]) {
          var adcBase = adcDrAddrs[a] - 0x4C;
          var cr2 = regs[adcBase + 0x08] || 0;
          if (cr2 & ADC_CR2_ADON) {
            var sq3 = regs[adcBase + 0x34] || 0;
            var channel = sq3 & 0x1F;
            var gpioLetter = null;
            var gpioBit = -1;
            if (channel <= 7) { gpioLetter = 'A'; gpioBit = channel; }
            else if (channel <= 9) { gpioLetter = 'B'; gpioBit = channel - 8; }
            else if (channel <= 15) { gpioLetter = 'C'; gpioBit = channel - 10; }
            if (gpioLetter) {
              var adcKey = gpioLetter + '_' + gpioBit;
              var pinName = PORT_PIN_MAP[adcKey];
              if (pinName) {
                var pinNum = parseInt(pinName.replace('pin_', ''));
                var adcLabel = null;
                var stmMap = { 14: 'A0', 15: 'A1', 16: 'A2', 17: 'A3', 18: 'A4', 19: 'A5' };
                adcLabel = stmMap[pinNum] || null;
                var adcVal = 0;
                if (adcLabel) {
                  var canvas = window.CircuitCanvas;
                  if (canvas && typeof canvas._readAnalogInput === 'function') {
                    var board = typeof canvas.getBoardInst === 'function' ? canvas.getBoardInst() : null;
                    if (board) {
                      var measured = Number(canvas._readAnalogInput(board.id, adcLabel));
                      if (Number.isFinite(measured)) {
                        adcVal = Math.round((measured / 1023) * 4095);
                      }
                    }
                  }
                }
                if (adcVal < 0) adcVal = 0;
                if (adcVal > 4095) adcVal = 4095;
                regs[addr] = adcVal;
                regs[adcBase + 0x00] = (regs[adcBase + 0x00] || 0) | 0x02;
              }
            }
          }
          return regs[addr] || 0;
        }
      }

      return regs[addr];
    }

    function _writeReg(addr, val) {
      regs[addr] = val;

      var portLetter = _getPortLetter(addr);
      var offset = _getOffset(addr);

      // ADC CR2: SWSTART with ADON set → mark conversion complete (EOC on SR)
      // Without this, `while (!(ADC1->SR & ADC_SR_EOC))` spins forever and freezes the browser.
      var _adcBases = [0x40012000, 0x40012400, 0x40012800];
      for (var ai = 0; ai < _adcBases.length; ai++) {
        if (addr === (_adcBases[ai] + 0x08)) { // CR2 offset = 0x08
          if ((val & ADC_CR2_ADON) && (val & ADC_CR2_SWSTART)) {
            var srAddr = _adcBases[ai];
            regs[srAddr] = (regs[srAddr] || 0) | ADC_SR_EOC;
            // Hardware clears SWSTART after starting conversion
            regs[addr] = val & ~ADC_CR2_SWSTART;
          }
          break;
        }
      }

      if (portLetter && offset === 0x14) {
        for (var bit = 0; bit < 16; bit++) {
          var key = portLetter + '_' + bit;
          var pinName = PORT_PIN_MAP[key];
          if (!pinName) continue;
          var nv = (val & (1 << bit)) ? 1 : 0;
          if (self.pinStates[pinName] !== nv) {
            self.pinStates[pinName] = nv;
            self._emitPinChange(pinName, nv);
          }
        }
      }

      if (portLetter && offset === 0x18) {
        var setMask = val & 0x0000FFFF;
        var resetMask = (val >> 16) & 0x0000FFFF;
        for (var bit2 = 0; bit2 < 16; bit2++) {
          var key2 = portLetter + '_' + bit2;
          var pinName2 = PORT_PIN_MAP[key2];
          if (!pinName2) continue;
          if (setMask & (1 << bit2)) {
            self.pinStates[pinName2] = 1;
            self._emitPinChange(pinName2, 1);
          }
          if (resetMask & (1 << bit2)) {
            self.pinStates[pinName2] = 0;
            self._emitPinChange(pinName2, 0);
          }
        }
      }

      if (portLetter && offset === 0x00) {
        for (var bit3 = 0; bit3 < 16; bit3++) {
          var key3 = portLetter + '_' + bit3;
          var pinName3 = PORT_PIN_MAP[key3];
          if (!pinName3) continue;
          var mode = (val >> (bit3 * 2)) & 0x03;
          if (mode === 0x01) {
            self.pinModes[pinName3] = 'OUTPUT';
          } else if (mode === 0x00) {
            self.pinModes[pinName3] = 'INPUT';
          } else {
            self.pinModes[pinName3] = 'ALT' + mode;
          }
        }
      }

      var uartDrAddrs = [0x40011004, 0x40004404, 0x40004804, 0x40004C04, 0x40005004, 0x40011404];
      for (var u = 0; u < uartDrAddrs.length; u++) {
        if (addr === uartDrAddrs[u]) {
          _uartHandler(uartDrAddrs[u] - 0x04, val & 0xFF);
        }
      }

      // TIM4 PWM: CCR1-4 → PD12-PD15 (D3-D6) duty cycle 0-255
      // TIM4 base 0x40000800; CCR1@0x34 CCR2@0x38 CCR3@0x3C CCR4@0x40
      if (addr >= 0x40000834 && addr <= 0x40000840) {
        var ccrIdx = Math.floor((addr - 0x40000834) / 4); // 0..3 → CH1..CH4
        var arr = regs[0x4000082C] || 0;
        var duty = 0;
        if (arr > 0) {
          duty = Math.max(0, Math.min(255, Math.round((val * 256) / (arr + 1))));
        } else if (val > 0) {
          duty = 255;
        }
        // TIM4_CH1=PD12(D3), CH2=PD13(D4), CH3=PD14(D5), CH4=PD15(D6)
        var tim4PinKeys = ['D_12', 'D_13', 'D_14', 'D_15'];
        var tim4PinName = PORT_PIN_MAP[tim4PinKeys[ccrIdx]];
        if (tim4PinName && self.pinStates[tim4PinName] !== duty) {
          self.pinStates[tim4PinName] = duty;
          self._emitPinChange(tim4PinName, duty);
        }
      }

      if (addr === 0x40023830) {
        regs[0x40023830] = val;
      }
      if (addr === 0x40023840) {
        regs[0x40023840] = val;
      }
      if (addr === 0x40023844) {
        regs[0x40023844] = val;
      }
    }

    function _hal_gpioWrite(portBase, pinMask, state) {
      var odrAddr = portBase + 0x14;
      var current = _readReg(odrAddr);
      if (state === 1 || state === 0x01) {
        _writeReg(odrAddr, current | pinMask);
      } else {
        _writeReg(odrAddr, current & ~pinMask);
      }
    }

    function _hal_gpioRead(portBase, pinMask) {
      var idrAddr = portBase + 0x10;
      var val = _readReg(idrAddr);
      return (val & pinMask) ? 1 : 0;
    }

    function _hal_gpioToggle(portBase, pinMask) {
      var odrAddr = portBase + 0x14;
      var current = _readReg(odrAddr);
      _writeReg(odrAddr, current ^ pinMask);
    }

    function _hal_gpioInit(portBase, gpioInit) {
      var moderAddr = portBase + 0x00;
      var otyperAddr = portBase + 0x04;
      var ospeedrAddr = portBase + 0x08;
      var pupdrAddr = portBase + 0x0C;

      var moder = _readReg(moderAddr);
      var otyper = _readReg(otyperAddr);
      var ospeedr = _readReg(ospeedrAddr);
      var pupdr = _readReg(pupdrAddr);

      var pin = 0;
      var mode = 0;
      var pull = 0;
      var speed = 0;
      var otype = 0;

      if (typeof gpioInit === 'object' && gpioInit !== null) {
        if (gpioInit.Pin !== undefined) pin = gpioInit.Pin;
        if (gpioInit.Mode !== undefined) mode = gpioInit.Mode;
        if (gpioInit.Pull !== undefined) pull = gpioInit.Pull;
        if (gpioInit.Speed !== undefined) speed = gpioInit.Speed;
        if (gpioInit.OType !== undefined) otype = gpioInit.OType;
      }

      for (var bit = 0; bit < 16; bit++) {
        if (pin & (1 << bit)) {
          moder &= ~(0x03 << (bit * 2));
          moder |= ((mode & 0x03) << (bit * 2));

          if (otype === 0x01) {
            otyper |= (1 << bit);
          } else {
            otyper &= ~(1 << bit);
          }

          ospeedr &= ~(0x03 << (bit * 2));
          ospeedr |= ((speed & 0x03) << (bit * 2));

          pupdr &= ~(0x03 << (bit * 2));
          pupdr |= ((pull & 0x03) << (bit * 2));
        }
      }

      _writeReg(moderAddr, moder);
      _writeReg(otyperAddr, otyper);
      _writeReg(ospeedrAddr, ospeedr);
      _writeReg(pupdrAddr, pupdr);
    }

    async function _hal_delay(ms) {
      if (self._a && self._a.delay) {
        await self._a.delay(ms);
      }
    }

    function _hal_init() {
    }

    function _hal_systemClockConfig() {
    }

    function _clkEnable() {
    }

    function _hal_adcStart(adcHandle) {
      var adcBase = 0x40012000;
      if (typeof adcHandle === 'object' && adcHandle !== null && adcHandle.Instance !== undefined) {
        var inst = adcHandle.Instance;
        if (inst === 'ADC1') adcBase = 0x40012000;
        else if (inst === 'ADC2') adcBase = 0x40012400;
        else if (inst === 'ADC3') adcBase = 0x40012800;
      }

      var channel = 0;
      var sqr3 = _readReg(adcBase + 0x34);
      channel = sqr3 & 0x1F;

      var portLetter = null;
      var bit = 0;
      if (channel <= 7) { portLetter = 'A'; bit = channel; }
      else if (channel <= 9) { portLetter = 'B'; bit = channel - 8; }
      else if (channel <= 15) { portLetter = 'C'; bit = channel - 10; }
      else if (channel <= 17) { portLetter = 'D'; bit = channel - 16; }
      else if (channel <= 18) { portLetter = 'E'; bit = channel - 17; }

      var raw = 0;
      if (portLetter) {
        var key = portLetter + '_' + bit;
        var pinName = PORT_PIN_MAP[key];
        if (pinName && self.pinStates[pinName]) {
          raw = self.pinStates[pinName];
        }
      }

      var adcVal = Math.min(4095, Math.round(raw * 4095));
      var sr = _readReg(adcBase + 0x00);
      _writeReg(adcBase + 0x00, sr | 0x02);
      _writeReg(adcBase + 0x4C, adcVal);
    }

    function _hal_adcGetValue(adcHandle) {
      var adcBase = 0x40012000;
      if (typeof adcHandle === 'object' && adcHandle !== null && adcHandle.Instance !== undefined) {
        var inst = adcHandle.Instance;
        if (inst === 'ADC1') adcBase = 0x40012000;
        else if (inst === 'ADC2') adcBase = 0x40012400;
        else if (inst === 'ADC3') adcBase = 0x40012800;
      }
      return _readReg(adcBase + 0x4C);
    }

    function _hal_adcPollForConversion(adcHandle, timeout) {
    }

    async function _hal_uartTransmit(uartHandle, data, size, timeout) {
      var bytes = null;
      if (typeof data === 'string') {
        bytes = [];
        for (var i = 0; i < data.length; i++) {
          bytes.push(data.charCodeAt(i) & 0xFF);
        }
      } else if (Array.isArray(data)) {
        bytes = data;
      }

      if (bytes && self._serialLog) {
        for (var j = 0; j < bytes.length; j++) {
          self._serialLog(String.fromCharCode(bytes[j] & 0xFF));
        }
      }
    }

    function _errorHandler() {
    }

    function _noop() {
    }

    function _hal_getTick() {
      return self._stm32_tick || 0;
    }

    function _hal_incTick() {
      self._stm32_tick = (self._stm32_tick || 0) + 1;
    }

    function _tftPower(on) {
      if (self._emitEvent) self._emitEvent('tft_power', { on: !!on });
    }

    function _tftFillScreen(color) {
      if (self._emitEvent) self._emitEvent('tft_draw', { op: 'fillScreen', color: color });
    }

    function _tftDrawPixel(x, y, color) {
      if (self._emitEvent) self._emitEvent('tft_draw', { op: 'pixel', x: x, y: y, color: color });
    }

    function _tftFillRect(x, y, w, h, color) {
      if (self._emitEvent) self._emitEvent('tft_draw', { op: 'fillRect', x: x, y: y, w: w, h: h, color: color });
    }

    function _tftDrawRect(x, y, w, h, color) {
      if (self._emitEvent) self._emitEvent('tft_draw', { op: 'rect', x: x, y: y, w: w, h: h, color: color });
    }

    function _tftFillCircle(x, y, r, color) {
      if (self._emitEvent) self._emitEvent('tft_draw', { op: 'fillCircle', x: x, y: y, r: r, color: color });
    }

    function _tftDrawCircle(x, y, r, color) {
      if (self._emitEvent) self._emitEvent('tft_draw', { op: 'circle', x: x, y: y, r: r, color: color });
    }

    function _tftDrawLine(x0, y0, x1, y1, color) {
      if (self._emitEvent) self._emitEvent('tft_draw', { op: 'line', x0: x0, y0: y0, x1: x1, y1: y1, color: color });
    }

    function _tftPrint(x, y, text, fg, bg, size) {
      if (self._emitEvent) self._emitEvent('tft_draw', { op: 'print', x: x, y: y, text: String(text), fg: fg || 0xFFFF, bg: bg || 0x0000, size: size || 1 });
    }

    return {
      _regR: _readReg,
      _regW: _writeReg,
      _hal_gpioWrite: _hal_gpioWrite,
      _hal_gpioRead: _hal_gpioRead,
      _hal_gpioToggle: _hal_gpioToggle,
      _hal_gpioInit: _hal_gpioInit,
      _hal_delay: _hal_delay,
      _hal_init: _hal_init,
      _hal_systemClockConfig: _hal_systemClockConfig,
      _clkEnable: _clkEnable,
      _hal_adcStart: _hal_adcStart,
      _hal_adcGetValue: _hal_adcGetValue,
      _hal_adcPollForConversion: _hal_adcPollForConversion,
      _hal_uartTransmit: _hal_uartTransmit,
      _errorHandler: _errorHandler,
      _noop: _noop,
      _hal_getTick: _hal_getTick,
      _hal_incTick: _hal_incTick,
      _tftPower: _tftPower,
      _tftFillScreen: _tftFillScreen,
      _tftDrawPixel: _tftDrawPixel,
      _tftFillRect: _tftFillRect,
      _tftDrawRect: _tftDrawRect,
      _tftFillCircle: _tftFillCircle,
      _tftDrawCircle: _tftDrawCircle,
      _tftDrawLine: _tftDrawLine,
      _tftPrint: _tftPrint,
    };
  },
};
