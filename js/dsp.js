/*
 * dsp.js — Digital Signal Processing engine for DSO
 * Hann Window, Radix-2 FFT, Spectrum Analysis, Measurement Algorithms
 * Dual-channel 1 GS/s realistic oscilloscope DSP
 */
'use strict';

const DSP = (() => {

  /* ------------ HANN WINDOW ------------ */
  function hannWindow(N) {
    const w = new Float64Array(N);
    for (let n = 0; n < N; n++) {
      w[n] = 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
    }
    return w;
  }

  /* ------------ RADIX-2 FFT (Cooley-Tukey) ------------ */
  // Input: interleaved real[] and imag[] arrays (length must be power of 2)
  // In-place Cooley-Tukey decimation-in-time FFT
  function fft(re, im) {
    const N = re.length;
    if (N === 0 || (N & (N - 1)) !== 0) return;

    // Bit-reversal permutation
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }

    // Butterfly stages
    for (let len = 2; len <= N; len <<= 1) {
      const half = len >> 1;
      const angle = -2 * Math.PI / len;
      const wRe = Math.cos(angle);
      const wIm = Math.sin(angle);

      for (let i = 0; i < N; i += len) {
        let curRe = 1, curIm = 0;
        for (let j = 0; j < half; j++) {
          const uRe = re[i + j];
          const uIm = im[i + j];
          const tRe = re[i + j + half] * curRe - im[i + j + half] * curIm;
          const tIm = re[i + j + half] * curIm + im[i + j + half] * curRe;
          re[i + j] = uRe + tRe;
          im[i + j] = uIm + tIm;
          re[i + j + half] = uRe - tRe;
          im[i + j + half] = uIm - tIm;
          const newCurRe = curRe * wRe - curIm * wIm;
          curIm = curRe * wIm + curIm * wRe;
          curRe = newCurRe;
        }
      }
    }
  }

  /* ------------ INVERSE FFT ------------ */
  function ifft(re, im) {
    const N = re.length;
    // Conjugate, run FFT, conjugate, scale
    for (let i = 0; i < N; i++) im[i] = -im[i];
    fft(re, im);
    for (let i = 0; i < N; i++) {
      re[i] /= N;
      im[i] = -im[i] / N;
    }
  }

  /* ------------ FFT COMPUTE ------------ */
  // Takes raw time-domain samples, applies window, runs FFT
  // Returns { magnitude: Float64Array, phase: Float64Array, freqAxis: Float64Array }
  function computeFFT(samples, sampleRate) {
    const N = samples.length;
    // Pad to next power of 2
    let fftN = 1;
    while (fftN < N) fftN <<= 1;

    const re = new Float64Array(fftN);
    const im = new Float64Array(fftN);

    // Apply Hann window
    const w = hannWindow(N);
    for (let i = 0; i < N; i++) {
      re[i] = samples[i] * w[i];
    }

    fft(re, im);

    // Compute magnitude (dB) and phase for first half (Nyquist)
    const halfN = fftN >> 1;
    const magnitude = new Float64Array(halfN);
    const phase = new Float64Array(halfN);
    const freqAxis = new Float64Array(halfN);

    for (let k = 0; k < halfN; k++) {
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      magnitude[k] = 20 * Math.log10(mag / (fftN / 2) + 1e-12); // Normalized dB
      phase[k] = Math.atan2(im[k], re[k]);
      freqAxis[k] = k * sampleRate / fftN;
    }

    return { magnitude, phase, freqAxis, fftN, sampleRate };
  }

  /* ------------ MEASUREMENT ALGORITHMS ------------ */

  function measureVpp(samples) {
    if (!samples || samples.length === 0) return 0;
    let vmin = Infinity, vmax = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] < vmin) vmin = samples[i];
      if (samples[i] > vmax) vmax = samples[i];
    }
    return vmax - vmin;
  }

  function measureVmax(samples) {
    if (!samples || samples.length === 0) return 0;
    let vmax = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] > vmax) vmax = samples[i];
    }
    return vmax;
  }

  function measureVmin(samples) {
    if (!samples || samples.length === 0) return 0;
    let vmin = Infinity;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] < vmin) vmin = samples[i];
    }
    return vmin;
  }

  function measureVrms(samples) {
    if (!samples || samples.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  function measureMean(samples) {
    if (!samples || samples.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i];
    }
    return sum / samples.length;
  }

  function measureFrequency(samples, sampleRate) {
    if (!samples || samples.length < 3 || sampleRate <= 0) return 0;
    const mid = measureMean(samples);
    let crossings = 0;
    let prevAbove = samples[0] > mid;
    for (let i = 1; i < samples.length; i++) {
      const above = samples[i] > mid;
      if (prevAbove && !above) crossings++;
      prevAbove = above;
    }
    if (crossings < 1) return 0;
    const duration = samples.length / sampleRate;
    return crossings / (2 * duration);
  }

  function measurePeriod(samples, sampleRate) {
    const freq = measureFrequency(samples, sampleRate);
    return freq > 0 ? 1 / freq : 0;
  }

  function measureDutyCycle(samples, sampleRate) {
    if (!samples || samples.length < 2 || sampleRate <= 0) return 0;
    const mid = measureMean(samples);
    let highCount = 0;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] > mid) highCount++;
    }
    return (highCount / samples.length) * 100;
  }

  // Zero-crossing frequency with interpolation for better accuracy
  function measureFrequencyInterpolated(samples, sampleRate) {
    if (!samples || samples.length < 4 || sampleRate <= 0) return 0;
    const mid = measureMean(samples);
    const dt = 1 / sampleRate;
    const riseTimes = [];

    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1] - mid;
      const curr = samples[i] - mid;
      if (prev <= 0 && curr > 0) {
        // Linear interpolation for zero crossing
        const frac = -prev / (curr - prev);
        riseTimes.push((i - 1 + frac) * dt);
      }
    }

    if (riseTimes.length < 2) return 0;
    let sumPeriod = 0;
    for (let i = 1; i < riseTimes.length; i++) {
      sumPeriod += riseTimes[i] - riseTimes[i - 1];
    }
    const avgPeriod = sumPeriod / (riseTimes.length - 1);
    return avgPeriod > 0 ? 1 / avgPeriod : 0;
  }

  // RMS voltage from AC-coupled samples (mean-subtracted)
  function measureVrmsAC(samples) {
    if (!samples || samples.length === 0) return 0;
    const mean = measureMean(samples);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i] - mean;
      sum += v * v;
    }
    return Math.sqrt(sum / samples.length);
  }

  // Crest factor: Vpeak / Vrms
  function measureCrestFactor(samples) {
    const vrms = measureVrms(samples);
    if (vrms === 0) return 0;
    const vpeak = Math.max(Math.abs(measureVmax(samples)), Math.abs(measureVmin(samples)));
    return vpeak / vrms;
  }

  // THD (Total Harmonic Distortion) via FFT peak search
  function measureTHD(samples, sampleRate) {
    if (!samples || samples.length < 16) return 0;
    const fftResult = computeFFT(samples, sampleRate);
    const mag = fftResult.magnitude;
    const halfN = mag.length;

    // Find fundamental peak (excluding DC at index 0)
    let fundIdx = 1;
    let fundMag = mag[1];
    for (let k = 2; k < halfN; k++) {
      if (mag[k] > fundMag) {
        fundMag = mag[k];
        fundIdx = k;
      }
    }
    if (fundIdx < 1) return 0;

    // Sum power of harmonics (2nd through 10th)
    let harmonicPower = 0;
    for (let h = 2; h <= 10; h++) {
      const idx = fundIdx * h;
      if (idx >= halfN) break;
      const hMag = Math.pow(10, mag[idx] / 20);
      harmonicPower += hMag * hMag;
    }

    const fundPower = Math.pow(10, fundMag / 20);
    if (fundPower === 0) return 0;
    return Math.sqrt(harmonicPower) / fundPower * 100;
  }

  /* ------------ SPECTRUM HELPERS ------------ */

  // Downsample FFT magnitude to display bins
  function downsampleSpectrum(magnitude, targetBins) {
    const srcLen = magnitude.length;
    if (srcLen <= targetBins) return magnitude;
    const result = new Float64Array(targetBins);
    const binSize = srcLen / targetBins;
    for (let i = 0; i < targetBins; i++) {
      const start = Math.floor(i * binSize);
      const end = Math.min(Math.floor((i + 1) * binSize), srcLen);
      let maxVal = -Infinity;
      for (let j = start; j < end; j++) {
        if (magnitude[j] > maxVal) maxVal = magnitude[j];
      }
      result[i] = maxVal;
    }
    return result;
  }

  // Convert linear magnitude to dBm (50 ohm reference)
  function magnitudeToDBm(magnitude, impedance = 50) {
    const result = new Float64Array(magnitude.length);
    for (let i = 0; i < magnitude.length; i++) {
      const v = Math.pow(10, magnitude[i] / 20);
      const power = (v * v) / impedance;
      result[i] = 10 * Math.log10(power / 0.001 + 1e-15);
    }
    return result;
  }

  /* ------------ MATH OPERATIONS ------------ */

  function mathAdd(ch1, ch2) {
    const len = Math.min(ch1.length, ch2.length);
    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) result[i] = ch1[i] + ch2[i];
    return result;
  }

  function mathSubtract(ch1, ch2) {
    const len = Math.min(ch1.length, ch2.length);
    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) result[i] = ch1[i] - ch2[i];
    return result;
  }

  function mathAbsoluteDiff(ch1, ch2) {
    const len = Math.min(ch1.length, ch2.length);
    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) result[i] = Math.abs(ch1[i] - ch2[i]);
    return result;
  }

  function mathMultiply(ch1, ch2) {
    const len = Math.min(ch1.length, ch2.length);
    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) result[i] = ch1[i] * ch2[i];
    return result;
  }

  /* ------------ CURSOR HELPERS ------------ */

  function interpolateSample(samples, times, targetTime) {
    if (!samples || samples.length < 2) return 0;
    // Binary search for bracket
    let lo = 0, hi = samples.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= targetTime) lo = mid; else hi = mid;
    }
    const t0 = times[lo], t1 = times[hi];
    const dt = t1 - t0;
    if (dt <= 0) return samples[lo];
    const frac = (targetTime - t0) / dt;
    return samples[lo] + frac * (samples[hi] - samples[lo]);
  }

  /* ------------ PUBLIC API ------------ */
  return {
    hannWindow,
    fft,
    ifft,
    computeFFT,
    measureVpp,
    measureVmax,
    measureVmin,
    measureVrms,
    measureVrmsAC,
    measureMean,
    measureFrequency,
    measureFrequencyInterpolated,
    measurePeriod,
    measureDutyCycle,
    measureCrestFactor,
    measureTHD,
    downsampleSpectrum,
    magnitudeToDBm,
    mathAdd,
    mathSubtract,
    mathAbsoluteDiff,
    mathMultiply,
    interpolateSample,
  };

})();

if (typeof window !== 'undefined') window.DSP = DSP;
