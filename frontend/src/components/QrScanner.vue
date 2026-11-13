<script>
import jsQR from "jsqr";

export default {
  props: {
    busy: { type: Boolean, default: false },
    error: { type: String, default: "" },
    feedback: { type: String, default: "" }
  },
  emits: ["detected"],
  data() {
    return {
      active: false,
      starting: false,
      hasScanned: false,
      cameraError: "",
      stream: null,
      animationFrame: null,
      lastFrameAt: 0,
      disposed: false
    };
  },
  beforeUnmount() {
    this.disposed = true;
    this.stopCamera();
  },
  methods: {
    async startCamera() {
      if (this.active || this.starting) return;
      this.cameraError = "";
      if (window.isSecureContext === false) {
        this.cameraError = "A câmera precisa de uma conexão segura (HTTPS).";
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        this.cameraError = "Este navegador não oferece acesso à câmera.";
        return;
      }

      this.starting = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        if (this.disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        this.stream = stream;
        this.active = true;
        await this.$nextTick();
        const video = this.$refs.video;
        video.srcObject = stream;
        await video.play();
        this.lastFrameAt = 0;
        this.readFrame();
      } catch (error) {
        this.stopCamera();
        this.cameraError = this.cameraErrorMessage(error);
      } finally {
        this.starting = false;
      }
    },
    stopCamera() {
      this.active = false;
      if (this.animationFrame !== null) {
        window.cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      if (this.$refs.video) this.$refs.video.srcObject = null;
    },
    cameraErrorMessage(error) {
      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        return "Permissão para usar a câmera negada. Libere o acesso nas configurações do navegador e tente novamente.";
      }
      if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
        return "Nenhuma câmera foi encontrada neste dispositivo.";
      }
      if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
        return "A câmera está em uso por outro aplicativo. Feche-o e tente novamente.";
      }
      if (error?.name === "OverconstrainedError") {
        return "Não foi possível acessar uma câmera traseira neste dispositivo.";
      }
      return "Não foi possível iniciar a câmera. Verifique as permissões e tente novamente.";
    },
    readFrame() {
      if (!this.active) return;
      const video = this.$refs.video;
      if (video?.videoWidth && video?.videoHeight && Date.now() - this.lastFrameAt >= 120) {
        this.lastFrameAt = Date.now();
        const canvas = this.$refs.canvas;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          this.stopCamera();
          this.cameraError = "Não foi possível processar a imagem da câmera.";
          return;
        }
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
          if (qr?.data) {
            this.hasScanned = true;
            this.stopCamera();
            this.$emit("detected", qr.data);
            return;
          }
        } catch (error) {
          console.error("Falha ao processar a imagem para leitura do QR Code:", error);
          this.stopCamera();
          this.cameraError = "Não foi possível processar a imagem da câmera.";
          return;
        }
      }
      this.animationFrame = window.requestAnimationFrame(this.readFrame);
    }
  }
};
</script>

<template>
  <div class="qr-scanner">
    <div v-if="active" class="qr-camera-preview">
      <video ref="video" autoplay muted playsinline aria-label="Imagem ao vivo da câmera"></video>
      <span class="qr-scan-frame" aria-hidden="true"></span>
      <canvas ref="canvas" class="qr-canvas"></canvas>
    </div>
    <button
      v-if="active"
      type="button"
      class="outline-button"
      @click="stopCamera"
    >Desligar câmera</button>
    <button
      v-else
      type="button"
      class="primary-button compact"
      :disabled="busy || starting"
      @click="startCamera"
    >{{ starting ? "Abrindo câmera..." : busy ? "Validando QR..." : hasScanned ? "Escanear próxima folha" : "Abrir câmera" }}</button>
    <p v-if="cameraError" class="auth-error" role="alert">{{ cameraError }}</p>
    <p v-else-if="error" class="auth-error" role="alert">{{ error }}</p>
    <p v-else-if="busy" class="qr-scan-feedback" aria-live="polite">Validando o QR Code na avaliação...</p>
    <p v-else-if="feedback" class="qr-scan-feedback" aria-live="polite">{{ feedback }}</p>
    <p v-else-if="active" class="qr-scan-feedback" aria-live="polite">Aponte a câmera para o QR Code da folha.</p>
    <p v-else class="qr-scan-feedback">A câmera será usada somente enquanto estiver ligada.</p>
  </div>
</template>
