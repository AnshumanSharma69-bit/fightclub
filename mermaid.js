flowchart TD

subgraph group_client["Client"]
  node_client_app["App Router<br/>next routes"]
  node_client_auth(("Auth State<br/>react context<br/>[AuthContext.jsx]"))
  node_client_api["API Client<br/>api boundary<br/>[api.js]"]
  node_client_map["Map View<br/>UI component<br/>[MapView.jsx]"]
  node_client_fightercard["Fighter Card<br/>UI component<br/>[FighterCard.jsx]"]
  node_client_challengemodal["Challenge Modal<br/>UI component<br/>[ChallengeModal.jsx]"]
  node_client_notifications["Notifications<br/>UI component"]
  node_client_share["Invite Modal<br/>UI component"]
end

subgraph group_server["Server"]
  node_server_index["API Server<br/>express app<br/>[index.js]"]
  node_server_auth_routes["Auth Routes<br/>route layer<br/>[auth.routes.js]"]
  node_server_fighter_routes["Fighter Routes<br/>route layer<br/>[fighter.routes.js]"]
  node_server_challenge_routes["Challenge Routes<br/>route layer"]
  node_server_zone_routes["Zone Routes<br/>route layer<br/>[zone.routes.js]"]
  node_server_admin_routes["Admin Routes<br/>route layer<br/>[admin.routes.js]"]
  node_server_auth_ctrl["Auth Logic<br/>controller<br/>[auth.controller.js]"]
  node_server_fighter_ctrl["Fighter Logic<br/>controller"]
  node_server_challenge_ctrl["Challenge Logic<br/>controller"]
  node_server_zone_ctrl["Zone Logic<br/>controller<br/>[zone.controller.js]"]
  node_server_models[("Mongo Models<br/>schema layer")]
  node_server_security["Auth Middleware<br/>security middleware<br/>[auth.middleware.js]"]
  node_server_runtime["Domain Utils<br/>service utils"]
end

node_client_app -->|"uses session"| node_client_auth
node_client_app -->|"calls API"| node_client_api
node_client_app -->|"renders map"| node_client_map
node_client_app -->|"drives flow"| node_client_challengemodal
node_client_app -->|"shows alerts"| node_client_notifications
node_client_app -->|"shows fighters"| node_client_fightercard
node_client_app -->|"invites"| node_client_share
node_client_api -->|"HTTP requests"| node_server_index
node_server_index -->|"mounts"| node_server_auth_routes
node_server_index -->|"mounts"| node_server_fighter_routes
node_server_index -->|"mounts"| node_server_challenge_routes
node_server_index -->|"mounts"| node_server_zone_routes
node_server_index -->|"mounts"| node_server_admin_routes
node_server_auth_routes -->|"delegates"| node_server_auth_ctrl
node_server_fighter_routes -->|"delegates"| node_server_fighter_ctrl
node_server_challenge_routes -->|"delegates"| node_server_challenge_ctrl
node_server_zone_routes -->|"delegates"| node_server_zone_ctrl
node_server_admin_routes -->|"protects"| node_server_security
node_server_auth_ctrl -->|"reads/writes"| node_server_models
node_server_fighter_ctrl -->|"reads/writes"| node_server_models
node_server_challenge_ctrl -->|"reads/writes"| node_server_models
node_server_zone_ctrl -->|"reads/writes"| node_server_models
node_server_challenge_ctrl -->|"uses"| node_server_runtime
node_server_fighter_ctrl -->|"uses"| node_server_runtime
node_server_zone_ctrl -->|"uses"| node_server_runtime
node_server_index -->|"applies"| node_server_security

click node_client_app "https://github.com/anshumansharma69-bit/fightclub/tree/main/client/app"
click node_client_auth "https://github.com/anshumansharma69-bit/fightclub/blob/main/client/context/AuthContext.jsx"
click node_client_api "https://github.com/anshumansharma69-bit/fightclub/blob/main/client/lib/api.js"
click node_client_map "https://github.com/anshumansharma69-bit/fightclub/blob/main/client/components/MapView.jsx"
click node_client_fightercard "https://github.com/anshumansharma69-bit/fightclub/blob/main/client/components/FighterCard.jsx"
click node_client_challengemodal "https://github.com/anshumansharma69-bit/fightclub/blob/main/client/components/ChallengeModal.jsx"
click node_client_notifications "https://github.com/anshumansharma69-bit/fightclub/blob/main/client/components/NotificationsPanel.jsx"
click node_client_share "https://github.com/anshumansharma69-bit/fightclub/blob/main/client/components/ShareInviteModal.jsx"
click node_server_index "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/index.js"
click node_server_auth_routes "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/routes/auth.routes.js"
click node_server_fighter_routes "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/routes/fighter.routes.js"
click node_server_challenge_routes "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/routes/challenge.routes.js"
click node_server_zone_routes "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/routes/zone.routes.js"
click node_server_admin_routes "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/routes/admin.routes.js"
click node_server_auth_ctrl "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/controllers/auth.controller.js"
click node_server_fighter_ctrl "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/controllers/fighter.controller.js"
click node_server_challenge_ctrl "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/controllers/challenge.controller.js"
click node_server_zone_ctrl "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/controllers/zone.controller.js"
click node_server_models "https://github.com/anshumansharma69-bit/fightclub/tree/main/server/models"
click node_server_security "https://github.com/anshumansharma69-bit/fightclub/blob/main/server/middleware/auth.middleware.js"
click node_server_runtime "https://github.com/anshumansharma69-bit/fightclub/tree/main/server/utils"

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_client_app,node_client_auth,node_client_api,node_client_map,node_client_fightercard,node_client_challengemodal,node_client_notifications,node_client_share toneBlue
class node_server_index,node_server_auth_routes,node_server_fighter_routes,node_server_challenge_routes,node_server_zone_routes,node_server_admin_routes,node_server_auth_ctrl,node_server_fighter_ctrl,node_server_challenge_ctrl,node_server_zone_ctrl,node_server_models,node_server_security,node_server_runtime toneAmber
