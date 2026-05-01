# Monorepo Architecture

This repository is a monorepo with multiple apps in `/app` folder. A `/lib` folder contains shared code used by all apps.

## Apps

Most apps are using Typescript as default language. For such apps there can be 3 types of architecure:


### The standalone server app
```md
apps/
└── <myapp>/
    ├── app/
    │   ├── presentation/
    │   ├── domain/
    │   ├── infrastructure/
    │   ├── utils/
    │   └── main.ts
    ├── package.json
    └── tsconfig.json
```

### The server+client app
```md
apps/
└── <myapp>/
    ├── client/
    │   ├── hooks/
    │   ├── contexts/
    │   ├── blocks/
    │   │   └── components/
    │   ├── layouts/
    │   └── pages/
    ├── server/
    │   ├── app/
    │   │   ├── presentation/
    │   │   ├── domain/
    │   │   ├── infrastructure/
    │   │   ├── utils/
    │   │   └── main.ts
    │   ├── package.json
    │   └── tsconfig.json
    └── interfaces/
        ├── dtos/
        └── domain/
```

### The microservices+client app
```md
apps/
└── <myapp>/
    ├── client/
    │   ├── hooks/
    │   ├── contexts/
    │   ├── blocks/
    │   │   └── components/
    │   ├── layouts/
    │   └── pages/
    ├── services/
    │   ├── <service-a>/
    │   │   ├── app/
    │   │   │   ├── presentation/
    │   │   │   ├── domain/
    │   │   │   ├── infrastructure/
    │   │   │   ├── utils/
    │   │   │   └── main.ts
    │   │   ├── package.json
    │   │   └── tsconfig.json
    │   └── <service-b>/
    │       └── ...
    └── interfaces/
        ├── dtos/
        └── domain/
```