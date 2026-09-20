// Demo product library. Prices and category order follow the supplied screenshots.
// Group and style options are illustrative and can be replaced with a live catalog.
const EXPERT_CATALOG = [
  {
    "id": "bags",
    "name": "包袋",
    "price": 2990,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "香奈儿 Chanel",
        "styles": [
          "Classic Flap",
          "2.55",
          "Boy Chanel"
        ]
      },
      {
        "name": "路易威登 Louis Vuitton",
        "styles": [
          "Speedy",
          "Neverfull",
          "Alma"
        ]
      },
      {
        "name": "古驰 Gucci",
        "styles": [
          "Jackie",
          "Horsebit 1955",
          "Dionysus"
        ]
      },
      {
        "name": "迪奥 Dior",
        "styles": [
          "Lady Dior",
          "Saddle",
          "Book Tote"
        ]
      }
    ],
    "icon": "handbag.svg"
  },
  {
    "id": "beauty",
    "name": "美妆",
    "price": 399,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "迪奥 Dior",
        "styles": [
          "口红 / 唇釉",
          "粉底 / 遮瑕",
          "眼影 / 腮红"
        ]
      },
      {
        "name": "香奈儿 Chanel",
        "styles": [
          "口红 / 唇釉",
          "粉底 / 遮瑕",
          "香水"
        ]
      },
      {
        "name": "M·A·C",
        "styles": [
          "口红",
          "粉底",
          "眼影"
        ]
      },
      {
        "name": "Lancôme",
        "styles": [
          "口红",
          "粉底",
          "护肤品"
        ]
      }
    ],
    "icon": "tabler-perfume.svg"
  },
  {
    "id": "footwear",
    "name": "鞋靴",
    "price": 499,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "耐克 Nike",
        "styles": [
          "Air Force 1",
          "Dunk",
          "Air Max"
        ]
      },
      {
        "name": "阿迪达斯 adidas",
        "styles": [
          "Samba",
          "Stan Smith",
          "Superstar"
        ]
      },
      {
        "name": "New Balance",
        "styles": [
          "574",
          "990",
          "2002R"
        ]
      },
      {
        "name": "匡威 Converse",
        "styles": [
          "Chuck Taylor All Star",
          "Chuck 70",
          "One Star"
        ]
      }
    ],
    "icon": "sneaker.svg"
  },
  {
    "id": "apparel",
    "name": "服饰",
    "price": 499,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "耐克 Nike",
        "styles": [
          "T恤",
          "卫衣",
          "运动外套"
        ]
      },
      {
        "name": "阿迪达斯 adidas",
        "styles": [
          "T恤",
          "运动套装",
          "运动外套"
        ]
      },
      {
        "name": "UNIQLO",
        "styles": [
          "衬衫",
          "针织衫",
          "羽绒服"
        ]
      },
      {
        "name": "Ralph Lauren",
        "styles": [
          "Polo 衫",
          "衬衫",
          "针织衫"
        ]
      }
    ],
    "icon": "t-shirt.svg"
  },
  {
    "id": "watches",
    "name": "手表",
    "price": 2990,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "劳力士 Rolex",
        "styles": [
          "Datejust",
          "Submariner",
          "Daytona"
        ]
      },
      {
        "name": "欧米茄 Omega",
        "styles": [
          "Seamaster",
          "Speedmaster",
          "Constellation"
        ]
      },
      {
        "name": "卡地亚 Cartier",
        "styles": [
          "Tank",
          "Santos",
          "Ballon Bleu"
        ]
      },
      {
        "name": "浪琴 Longines",
        "styles": [
          "Master Collection",
          "DolceVita",
          "HydroConquest"
        ]
      }
    ],
    "icon": "watch.svg"
  },
  {
    "id": "accessories",
    "name": "配饰",
    "price": 699,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "爱马仕 Hermès",
        "styles": [
          "丝巾",
          "腰带",
          "帽饰"
        ]
      },
      {
        "name": "古驰 Gucci",
        "styles": [
          "腰带",
          "围巾",
          "帽饰"
        ]
      },
      {
        "name": "路易威登 Louis Vuitton",
        "styles": [
          "腰带",
          "丝巾",
          "太阳镜"
        ]
      },
      {
        "name": "博柏利 Burberry",
        "styles": [
          "围巾",
          "帽饰",
          "腰带"
        ]
      }
    ],
    "icon": "sunglasses.svg"
  },
  {
    "id": "spirits",
    "name": "酒",
    "price": 990,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "茅台",
        "styles": [
          "飞天茅台",
          "茅台年份酒"
        ]
      },
      {
        "name": "五粮液",
        "styles": [
          "经典五粮液",
          "五粮液 1618"
        ]
      },
      {
        "name": "泸州老窖",
        "styles": [
          "国窖 1573",
          "特曲",
          "头曲"
        ]
      },
      {
        "name": "Hennessy",
        "styles": [
          "V.S",
          "V.S.O.P",
          "X.O"
        ]
      }
    ],
    "icon": "wine.svg"
  },
  {
    "id": "trading-cards",
    "name": "卡牌",
    "price": 499,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "集换式游戏卡",
        "styles": [
          "宝可梦卡牌",
          "游戏王卡牌",
          "万智牌"
        ]
      },
      {
        "name": "体育球星卡",
        "styles": [
          "篮球球星卡",
          "足球球星卡",
          "棒球球星卡"
        ]
      },
      {
        "name": "影视动漫收藏卡",
        "styles": [
          "动漫角色卡",
          "电影主题卡",
          "电视剧主题卡"
        ]
      },
      {
        "name": "纪念收藏卡",
        "styles": [
          "活动纪念卡",
          "品牌联名卡"
        ]
      }
    ],
    "icon": "cards.svg"
  },
  {
    "id": "beauty-nondestructive",
    "name": "美妆无损",
    "price": 399,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "迪奥 Dior",
        "styles": [
          "口红包装",
          "粉底包装",
          "香水包装"
        ]
      },
      {
        "name": "香奈儿 Chanel",
        "styles": [
          "口红包装",
          "粉底包装",
          "香水包装"
        ]
      },
      {
        "name": "Estée Lauder",
        "styles": [
          "护肤品包装",
          "粉底包装"
        ]
      },
      {
        "name": "Lancôme",
        "styles": [
          "护肤品包装",
          "口红包装",
          "粉底包装"
        ]
      }
    ],
    "icon": "seal-check.svg"
  },
  {
    "id": "coins",
    "name": "钱币",
    "price": 199,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "古代钱币",
        "styles": [
          "方孔钱",
          "刀币",
          "布币"
        ]
      },
      {
        "name": "近现代机制币",
        "styles": [
          "银币",
          "铜币",
          "镍币"
        ]
      },
      {
        "name": "现代纪念币",
        "styles": [
          "普通纪念币",
          "贵金属纪念币"
        ]
      },
      {
        "name": "纸币",
        "styles": [
          "人民币纸币",
          "外国纸币",
          "纪念钞"
        ]
      }
    ],
    "icon": "coin.svg"
  },
  {
    "id": "electronics-appliances",
    "name": "数码家电",
    "price": 599,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "苹果 Apple",
        "styles": [
          "手机",
          "平板电脑",
          "笔记本电脑"
        ]
      },
      {
        "name": "华为 Huawei",
        "styles": [
          "手机",
          "平板电脑",
          "笔记本电脑"
        ]
      },
      {
        "name": "索尼 Sony",
        "styles": [
          "相机",
          "耳机",
          "游戏主机"
        ]
      },
      {
        "name": "戴森 Dyson",
        "styles": [
          "吸尘器",
          "吹风机",
          "空气净化风扇"
        ]
      }
    ],
    "icon": "devices.svg"
  },
  {
    "id": "electronics-nondestructive",
    "name": "3C无损",
    "price": 599,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "苹果 Apple",
        "styles": [
          "手机外观",
          "平板电脑外观",
          "智能手表外观"
        ]
      },
      {
        "name": "华为 Huawei",
        "styles": [
          "手机外观",
          "平板电脑外观",
          "智能手表外观"
        ]
      },
      {
        "name": "三星 Samsung",
        "styles": [
          "手机外观",
          "平板电脑外观",
          "智能手表外观"
        ]
      },
      {
        "name": "索尼 Sony",
        "styles": [
          "相机外观",
          "耳机外观",
          "游戏主机外观"
        ]
      }
    ],
    "icon": "device-mobile.svg"
  },
  {
    "id": "jewelry",
    "name": "首饰",
    "price": 699,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "蒂芙尼 Tiffany & Co.",
        "styles": [
          "Tiffany T",
          "HardWear",
          "Return to Tiffany"
        ]
      },
      {
        "name": "卡地亚 Cartier",
        "styles": [
          "LOVE",
          "Juste un Clou",
          "Trinity"
        ]
      },
      {
        "name": "Van Cleef & Arpels",
        "styles": [
          "Alhambra",
          "Perlée",
          "Frivole"
        ]
      },
      {
        "name": "宝格丽 Bvlgari",
        "styles": [
          "B.zero1",
          "Serpenti",
          "Divas’ Dream"
        ]
      }
    ],
    "icon": "crown.svg"
  },
  {
    "id": "porcelain",
    "name": "瓷器",
    "price": 499,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "青花瓷",
        "styles": [
          "碗",
          "瓶",
          "罐"
        ]
      },
      {
        "name": "粉彩瓷",
        "styles": [
          "盘",
          "碗",
          "瓶"
        ]
      },
      {
        "name": "单色釉",
        "styles": [
          "青釉器",
          "白釉器",
          "红釉器"
        ]
      },
      {
        "name": "彩绘瓷",
        "styles": [
          "五彩瓷",
          "斗彩瓷",
          "珐琅彩瓷"
        ]
      }
    ],
    "icon": "tabler-teapot.svg"
  },
  {
    "id": "wood-beads",
    "name": "木作手串",
    "price": 399,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "木质手串",
        "styles": [
          "紫檀类",
          "黄花梨类",
          "沉香类"
        ]
      },
      {
        "name": "籽核手串",
        "styles": [
          "菩提子类",
          "橄榄核类",
          "桃核类"
        ]
      },
      {
        "name": "木雕摆件",
        "styles": [
          "人物木雕",
          "动物木雕",
          "山水木雕"
        ]
      },
      {
        "name": "木质随身物件",
        "styles": [
          "挂件",
          "把件",
          "珠串配件"
        ]
      }
    ],
    "icon": "tree.svg"
  },
  {
    "id": "antiques",
    "name": "古玩文玩",
    "price": 499,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "金属器",
        "styles": [
          "铜炉",
          "铜镜",
          "金属摆件"
        ]
      },
      {
        "name": "文房用品",
        "styles": [
          "砚台",
          "笔筒",
          "镇纸"
        ]
      },
      {
        "name": "传统工艺品",
        "styles": [
          "漆器",
          "竹雕",
          "石雕"
        ]
      },
      {
        "name": "民俗收藏",
        "styles": [
          "老印章",
          "老锁具",
          "民俗摆件"
        ]
      }
    ],
    "icon": "flower.svg"
  },
  {
    "id": "sports-equipment",
    "name": "运动装备",
    "price": 699,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "Yonex",
        "styles": [
          "羽毛球拍",
          "网球拍",
          "运动背包"
        ]
      },
      {
        "name": "Wilson",
        "styles": [
          "网球拍",
          "篮球",
          "棒球手套"
        ]
      },
      {
        "name": "HEAD",
        "styles": [
          "网球拍",
          "滑雪板",
          "滑雪头盔"
        ]
      },
      {
        "name": "Decathlon",
        "styles": [
          "健身器材",
          "露营装备",
          "骑行装备"
        ]
      }
    ],
    "icon": "barbell.svg"
  },
  {
    "id": "herbal-materials",
    "name": "药材",
    "price": 499,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "根及根茎类",
        "styles": [
          "人参外观识别",
          "黄芪外观识别",
          "当归外观识别"
        ]
      },
      {
        "name": "花及叶类",
        "styles": [
          "菊花外观识别",
          "金银花外观识别",
          "艾叶外观识别"
        ]
      },
      {
        "name": "果实及种子类",
        "styles": [
          "枸杞外观识别",
          "决明子外观识别",
          "酸枣仁外观识别"
        ]
      },
      {
        "name": "皮及藤木类",
        "styles": [
          "陈皮外观识别",
          "肉桂外观识别",
          "鸡血藤外观识别"
        ]
      }
    ],
    "icon": "pill.svg"
  },
  {
    "id": "gems-jade",
    "name": "珠宝玉石",
    "price": 499,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "翡翠",
        "styles": [
          "手镯",
          "挂件",
          "戒面"
        ]
      },
      {
        "name": "和田玉",
        "styles": [
          "手镯",
          "挂件",
          "把件"
        ]
      },
      {
        "name": "彩色宝石",
        "styles": [
          "红宝石",
          "蓝宝石",
          "祖母绿"
        ]
      },
      {
        "name": "有机宝石",
        "styles": [
          "珍珠",
          "琥珀",
          "珊瑚"
        ]
      }
    ],
    "icon": "diamond.svg"
  },
  {
    "id": "stamps",
    "name": "邮票",
    "price": 399,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "普通邮票",
        "styles": [
          "单枚",
          "套票",
          "连票"
        ]
      },
      {
        "name": "纪念邮票",
        "styles": [
          "人物纪念",
          "事件纪念",
          "周年纪念"
        ]
      },
      {
        "name": "特种邮票",
        "styles": [
          "自然主题",
          "文化主题",
          "建筑主题"
        ]
      },
      {
        "name": "邮品",
        "styles": [
          "首日封",
          "小型张",
          "小全张"
        ]
      }
    ],
    "icon": "tabler-email-stamp.svg"
  },
  {
    "id": "designer-toys",
    "name": "潮玩",
    "price": 499,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "泡泡玛特 POP MART",
        "styles": [
          "MOLLY",
          "DIMOO",
          "SKULLPANDA",
          "THE MONSTERS"
        ]
      },
      {
        "name": "MEDICOM TOY",
        "styles": [
          "BE@RBRICK",
          "R@BBRICK",
          "MAFEX"
        ]
      },
      {
        "name": "TOP TOY",
        "styles": [
          "盲盒",
          "拼装积木",
          "收藏摆件"
        ]
      }
    ],
    "icon": "game-controller.svg"
  },
  {
    "id": "jk-uniforms",
    "name": "JK 制服",
    "price": 499,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "水手服",
        "styles": [
          "长袖水手服",
          "短袖水手服",
          "无袖水手服"
        ]
      },
      {
        "name": "制服上装",
        "styles": [
          "制服衬衫",
          "西式制服外套",
          "针织背心"
        ]
      },
      {
        "name": "制服裙装",
        "styles": [
          "格裙",
          "纯色百褶裙",
          "背带裙"
        ]
      },
      {
        "name": "制服配件",
        "styles": [
          "领结",
          "领带",
          "领巾"
        ]
      }
    ],
    "icon": "t-shirt.svg"
  },
  {
    "id": "celebrity-autographs",
    "name": "明星签名",
    "price": 499,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "纸质签名",
        "styles": [
          "签名照",
          "签名海报",
          "签名卡"
        ]
      },
      {
        "name": "出版物签名",
        "styles": [
          "签名专辑",
          "签名书籍",
          "签名杂志"
        ]
      },
      {
        "name": "服饰签名",
        "styles": [
          "签名球衣",
          "签名T恤",
          "签名帽"
        ]
      },
      {
        "name": "纪念品签名",
        "styles": [
          "签名球类",
          "签名玩具",
          "签名周边"
        ]
      }
    ],
    "icon": "pen-nib.svg"
  },
  {
    "id": "pets",
    "name": "宠物",
    "price": 399,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "猫",
        "styles": [
          "毛色花纹识别",
          "长短毛特征识别",
          "体貌特征描述"
        ]
      },
      {
        "name": "犬",
        "styles": [
          "毛色花纹识别",
          "长短毛特征识别",
          "体貌特征描述"
        ]
      },
      {
        "name": "观赏鱼",
        "styles": [
          "淡水观赏鱼识别",
          "海水观赏鱼识别"
        ]
      },
      {
        "name": "小型伴侣动物",
        "styles": [
          "兔类外观识别",
          "仓鼠类外观识别",
          "豚鼠类外观识别"
        ]
      }
    ],
    "icon": "paw-print.svg"
  },
  {
    "id": "balls",
    "name": "球类",
    "price": 499,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "篮球",
        "styles": [
          "室内篮球",
          "室外篮球",
          "纪念篮球"
        ]
      },
      {
        "name": "足球",
        "styles": [
          "比赛足球",
          "训练足球",
          "五人制足球"
        ]
      },
      {
        "name": "排球",
        "styles": [
          "室内排球",
          "沙滩排球"
        ]
      },
      {
        "name": "小球类",
        "styles": [
          "网球",
          "乒乓球",
          "高尔夫球"
        ]
      }
    ],
    "icon": "soccer-ball.svg"
  },
  {
    "id": "gold-silver",
    "name": "黄金银饰",
    "price": 499,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "黄金饰品",
        "styles": [
          "戒指",
          "项链",
          "手镯"
        ]
      },
      {
        "name": "K金饰品",
        "styles": [
          "戒指",
          "吊坠",
          "耳饰"
        ]
      },
      {
        "name": "银饰",
        "styles": [
          "戒指",
          "手链",
          "项链"
        ]
      },
      {
        "name": "贵金属工艺品",
        "styles": [
          "金银摆件",
          "金银纪念章",
          "银制器皿"
        ]
      }
    ],
    "icon": "crown.svg"
  },
  {
    "id": "hairy-crabs",
    "name": "大闸蟹",
    "price": 99,
    "groupLabel": "种类",
    "styleLabel": "细分类型",
    "groups": [
      {
        "name": "活蟹外观",
        "styles": [
          "背甲特征",
          "螯足特征",
          "腹部特征"
        ]
      },
      {
        "name": "礼盒包装",
        "styles": [
          "普通礼盒",
          "保温礼盒",
          "联名礼盒"
        ]
      },
      {
        "name": "标识及凭证",
        "styles": [
          "蟹扣标识",
          "礼券票面",
          "包装标签"
        ]
      }
    ],
    "icon": "bowl-food.svg"
  },
  {
    "id": "household-care",
    "name": "日化",
    "price": 499,
    "groupLabel": "品牌",
    "styleLabel": "款式 / 系列",
    "groups": [
      {
        "name": "Blue Moon 蓝月亮",
        "styles": [
          "洗衣液",
          "洗手液",
          "清洁剂"
        ]
      },
      {
        "name": "Dettol 滴露",
        "styles": [
          "洗手液",
          "衣物除菌液",
          "消毒液"
        ]
      },
      {
        "name": "LION 狮王",
        "styles": [
          "牙膏",
          "牙刷",
          "洗衣液"
        ]
      },
      {
        "name": "Dove 多芬",
        "styles": [
          "沐浴露",
          "洗发水",
          "护发素"
        ]
      }
    ],
    "icon": "drop.svg"
  }
];
