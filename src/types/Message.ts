const MESSAGE_TYPE = {
  ADD_IMAGE: "ADD_IMAGE",
} as const

type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE]

export interface SendMessage {
  type: MessageType
  imageData: string
}
