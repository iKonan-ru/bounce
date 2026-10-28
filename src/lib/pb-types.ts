/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export const Collections = {
	Authorigins: "_authOrigins",
	Externalauths: "_externalAuths",
	Mfas: "_mfas",
	Otps: "_otps",
	Superusers: "_superusers",
	Comments: "comments",
	Findings: "findings",
	Ideas: "ideas",
	Lyrics: "lyrics",
	SongStages: "song_stages",
	Songs: "songs",
	StageTemplates: "stage_templates",
	Users: "users",
} as const
export type Collections = typeof Collections[keyof typeof Collections]

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export type CommentsRecord = {
	author: RecordIdString
	created: IsoAutoDateString
	id: string
	song: RecordIdString
	stage?: RecordIdString
	text: string
	updated: IsoAutoDateString
}

export const FindingsInstrumentOptions = {
	"vocals": "vocals",
	"guitar": "guitar",
	"bass": "bass",
	"drums": "drums",
	"synths": "synths",
	"mix": "mix",
	"master": "master",
} as const
export type FindingsInstrumentOptions = typeof FindingsInstrumentOptions[keyof typeof FindingsInstrumentOptions]

export const FindingsCategoryOptions = {
	"preamp": "preamp",
	"processor": "processor",
	"cabinet": "cabinet",
	"mic": "mic",
	"plugin": "plugin",
	"technique": "technique",
	"other": "other",
} as const
export type FindingsCategoryOptions = typeof FindingsCategoryOptions[keyof typeof FindingsCategoryOptions]
export type FindingsRecord<Ttags = unknown> = {
	author: RecordIdString
	category?: FindingsCategoryOptions
	created: IsoAutoDateString
	description?: string
	id: string
	instrument?: FindingsInstrumentOptions
	library?: boolean
	settings?: string
	song?: RecordIdString
	stage?: RecordIdString
	tags?: null | Ttags
	title: string
	updated: IsoAutoDateString
}

export const IdeasKindOptions = {
	"song": "song",
	"video": "video",
} as const
export type IdeasKindOptions = typeof IdeasKindOptions[keyof typeof IdeasKindOptions]
export type IdeasRecord<Ttags = unknown> = {
	author: RecordIdString
	created: IsoAutoDateString
	id: string
	kind: IdeasKindOptions
	song?: RecordIdString
	tags?: null | Ttags
	text: string
	updated: IsoAutoDateString
}

export type LyricsRecord = {
	author: RecordIdString
	created: IsoAutoDateString
	id: string
	song: RecordIdString
	text?: string
	updated: IsoAutoDateString
}

export const SongStagesStatusOptions = {
	"not_started": "not_started",
	"in_progress": "in_progress",
	"review": "review",
	"done": "done",
	"skipped": "skipped",
} as const
export type SongStagesStatusOptions = typeof SongStagesStatusOptions[keyof typeof SongStagesStatusOptions]
export type SongStagesRecord<Tsubsteps = unknown> = {
	created: IsoAutoDateString
	deadline?: IsoDateString
	id: string
	note?: string
	optional?: boolean
	position?: number
	song: RecordIdString
	status: SongStagesStatusOptions
	substeps?: null | Tsubsteps
	title: string
	updated: IsoAutoDateString
}

export const SongsStatusOptions = {
	"active": "active",
	"paused": "paused",
	"done": "done",
	"released": "released",
} as const
export type SongsStatusOptions = typeof SongsStatusOptions[keyof typeof SongsStatusOptions]
export type SongsRecord = {
	bpm?: number
	created: IsoAutoDateString
	id: string
	key?: string
	note?: string
	status: SongsStatusOptions
	target_release?: IsoDateString
	title: string
	updated: IsoAutoDateString
}

export type StageTemplatesRecord<Tsubsteps = unknown> = {
	created: IsoAutoDateString
	id: string
	optional?: boolean
	position?: number
	substeps?: null | Tsubsteps
	title: string
	updated: IsoAutoDateString
}

export type UsersRecord = {
	avatar?: FileNameString
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type CommentsResponse<Texpand = unknown> = Required<CommentsRecord> & BaseSystemFields<Texpand>
export type FindingsResponse<Ttags = unknown, Texpand = unknown> = Required<FindingsRecord<Ttags>> & BaseSystemFields<Texpand>
export type IdeasResponse<Ttags = unknown, Texpand = unknown> = Required<IdeasRecord<Ttags>> & BaseSystemFields<Texpand>
export type LyricsResponse<Texpand = unknown> = Required<LyricsRecord> & BaseSystemFields<Texpand>
export type SongStagesResponse<Tsubsteps = unknown, Texpand = unknown> = Required<SongStagesRecord<Tsubsteps>> & BaseSystemFields<Texpand>
export type SongsResponse<Texpand = unknown> = Required<SongsRecord> & BaseSystemFields<Texpand>
export type StageTemplatesResponse<Tsubsteps = unknown, Texpand = unknown> = Required<StageTemplatesRecord<Tsubsteps>> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	comments: CommentsRecord
	findings: FindingsRecord
	ideas: IdeasRecord
	lyrics: LyricsRecord
	song_stages: SongStagesRecord
	songs: SongsRecord
	stage_templates: StageTemplatesRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	comments: CommentsResponse
	findings: FindingsResponse
	ideas: IdeasResponse
	lyrics: LyricsResponse
	song_stages: SongStagesResponse
	songs: SongsResponse
	stage_templates: StageTemplatesResponse
	users: UsersResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
